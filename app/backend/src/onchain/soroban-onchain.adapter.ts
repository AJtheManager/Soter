import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Contract, Keypair, Networks, SorobanRpc, TransactionBuilder,
  BASE_FEE, xdr, nativeToScVal, Address, scValToNative,
} from "@stellar/stellar-sdk";
import {
  OnchainAdapter, ONCHAIN_ADAPTER_TOKEN,
  InitEscrowParams, InitEscrowResult,
  CreateAidPackageParams, CreateAidPackageResult,
  BatchCreateAidPackagesParams, BatchCreateAidPackagesResult,
  ClaimAidPackageParams, ClaimAidPackageResult,
  DisburseAidPackageParams, DisburseAidPackageResult,
  GetAidPackageParams, GetAidPackageResult,
  GetAidPackageCountParams, GetAidPackageCountResult,
  GetTokenBalanceParams, GetTokenBalanceResult,
  CreateClaimParams, CreateClaimResult,
  DisburseParams, DisburseResult,
} from "./onchain.adapter";

@Injectable()
export class SorobanOnchainAdapter implements OnchainAdapter {
  private readonly logger = new Logger(SorobanOnchainAdapter.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract: Contract;
  private readonly keypair: Keypair;
  private readonly networkPassphrase: string;
  private readonly contractId: string;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = config.getOrThrow<string>("SOROBAN_RPC_URL");
    const secretKey = config.getOrThrow<string>("SOROBAN_SECRET_KEY");
    this.contractId = config.getOrThrow<string>("SOROBAN_CONTRACT_ID");
    const network = config.get<string>("STELLAR_NETWORK", "testnet");
    this.networkPassphrase = network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
    this.server = new SorobanRpc.Server(rpcUrl, { allowHttp: false });
    this.contract = new Contract(this.contractId);
    this.keypair = Keypair.fromSecret(secretKey);
  }

  private async invoke(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
    const account = await this.server.getAccount(this.keypair.publicKey());
    const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: this.networkPassphrase })
      .addOperation(this.contract.call(method, ...args)).setTimeout(30).build();
    const simResult = await this.server.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simResult)) { throw new Error("Simulation failed"); }
    const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
    preparedTx.sign(this.keypair);
    const sendResult = await this.server.sendTransaction(preparedTx);
    if (sendResult.status === "ERROR") { throw new Error("Transaction submission error"); }
    const hash = sendResult.hash;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const status = await this.server.getTransaction(hash);
      if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        const ok = status as SorobanRpc.Api.GetSuccessfulTransactionResponse;
        return ok.returnValue ?? xdr.ScVal.scvVoid();
      }
      if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new Error("Transaction " + hash + " failed on-chain");
      }
    }
    throw new Error("Transaction " + hash + " timed out");
  }

  async initEscrow(params: InitEscrowParams): Promise<InitEscrowResult> {
    await this.invoke("initialize", [new Address(params.adminAddress).toScVal()]);
    return { escrowAddress: this.contractId, transactionHash: "", timestamp: new Date(), status: "success" };
  }

  async createAidPackage(params: CreateAidPackageParams): Promise<CreateAidPackageResult> {
    await this.invoke("create_package", [
      new Address(params.operatorAddress).toScVal(),
      nativeToScVal(BigInt(params.packageId), { type: "u64" }),
      new Address(params.recipientAddress).toScVal(),
      nativeToScVal(BigInt(params.amount), { type: "i128" }),
      new Address(params.tokenAddress).toScVal(),
      nativeToScVal(BigInt(params.expiresAt), { type: "u64" }),
    ]);
    return { packageId: params.packageId, transactionHash: "", timestamp: new Date(), status: "success" };
  }

  async batchCreateAidPackages(params: BatchCreateAidPackagesParams): Promise<BatchCreateAidPackagesResult> {
    const packageIds: string[] = [];
    for (let i = 0; i < params.recipientAddresses.length; i++) {
      const id = String(Date.now()) + "-" + String(i);
      await this.createAidPackage({ operatorAddress: params.operatorAddress, packageId: id,
        recipientAddress: params.recipientAddresses[i], amount: params.amounts[i],
        tokenAddress: params.tokenAddress, expiresAt: Math.floor(Date.now() / 1000) + params.expiresIn });
      packageIds.push(id);
    }
    return { packageIds, transactionHash: "", timestamp: new Date(), status: "success" };
  }

  async claimAidPackage(params: ClaimAidPackageParams): Promise<ClaimAidPackageResult> {
    await this.invoke("claim_package", [
      nativeToScVal(BigInt(params.packageId), { type: "u64" }),
      new Address(params.recipientAddress).toScVal(),
    ]);
    return { packageId: params.packageId, transactionHash: "", timestamp: new Date(), status: "success", amountClaimed: "0" };
  }

  async disburseAidPackage(params: DisburseAidPackageParams): Promise<DisburseAidPackageResult> {
    await this.invoke("disburse_package", [
      nativeToScVal(BigInt(params.packageId), { type: "u64" }),
      new Address(params.operatorAddress).toScVal(),
    ]);
    return { packageId: params.packageId, transactionHash: "", timestamp: new Date(), status: "success", amountDisbursed: "0" };
  }

  async getAidPackage(params: GetAidPackageParams): Promise<GetAidPackageResult> {
    const val = await this.invoke("get_package", [nativeToScVal(BigInt(params.packageId), { type: "u64" })]);
    const pkg = scValToNative(val) as any;
    return { package: { id: params.packageId, recipient: pkg?.recipient ?? "",
      amount: String(pkg?.amount ?? "0"), token: pkg?.token ?? "",
      status: pkg?.status ?? "Created", createdAt: Number(pkg?.created_at ?? 0),
      expiresAt: Number(pkg?.expires_at ?? 0) }, timestamp: new Date() };
  }

  async getAidPackageCount(params: GetAidPackageCountParams): Promise<GetAidPackageCountResult> {
    const val = await this.invoke("get_aggregates", [new Address(params.token).toScVal()]);
    const agg = scValToNative(val) as any;
    return { aggregates: { totalCommitted: String(agg?.total_committed ?? "0"),
      totalClaimed: String(agg?.total_claimed ?? "0"),
      totalExpiredCancelled: String(agg?.total_expired_cancelled ?? "0") }, timestamp: new Date() };
  }

  async getTokenBalance(params: GetTokenBalanceParams): Promise<GetTokenBalanceResult> {
    const val = await this.invoke("get_balance", [new Address(params.tokenAddress).toScVal(), new Address(params.accountAddress).toScVal()]);
    return { tokenAddress: params.tokenAddress, accountAddress: params.accountAddress, balance: String(scValToNative(val) ?? "0"), timestamp: new Date() };
  }

  async createClaim(params: CreateClaimParams): Promise<CreateClaimResult> {
    const result = await this.createAidPackage({ operatorAddress: this.keypair.publicKey(),
      packageId: params.claimId, recipientAddress: params.recipientAddress, amount: params.amount,
      tokenAddress: params.tokenAddress, expiresAt: params.expiresAt ?? Math.floor(Date.now() / 1000) + 86400 * 30 });
    return { packageId: result.packageId, transactionHash: result.transactionHash, timestamp: result.timestamp, status: result.status };
  }

  async disburse(params: DisburseParams): Promise<DisburseResult> {
    const result = await this.disburseAidPackage({ packageId: params.packageId,
      operatorAddress: params.recipientAddress ?? this.keypair.publicKey() });
    return { transactionHash: result.transactionHash, timestamp: result.timestamp, status: result.status, amountDisbursed: result.amountDisbursed };
  }
}

export { ONCHAIN_ADAPTER_TOKEN };
