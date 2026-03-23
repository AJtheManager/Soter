import type { BackendHealthResponse } from '@/types/health';
import type { AidPackage } from '@/types/aid-package';

export type MockHandler = (
  url: string,
  options?: RequestInit,
) => Promise<Response>;

const healthHandler: MockHandler = async () => {
  const mockResponse: BackendHealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0-mock',
    service: 'soter-backend-mock',
    details: {
      uptime: 12345,
    },
  };

  return new Response(JSON.stringify(mockResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const ALL_PACKAGES: AidPackage[] = [
  {
    id: 'AID-001',
    title: 'Emergency Food Relief',
    region: 'Eastern Region',
    amount: '12,500 USDC',
    recipients: 250,
    status: 'Active',
    token: 'USDC',
  },
  {
    id: 'AID-002',
    title: 'Medical Supplies',
    region: 'Northern Zone',
    amount: '8,000 USDC',
    recipients: 120,
    status: 'Active',
    token: 'USDC',
  },
  {
    id: 'AID-003',
    title: 'Shelter & Housing',
    region: 'Coastal Area',
    amount: '30,000 XLM',
    recipients: 75,
    status: 'Claimed',
    token: 'XLM',
  },
  {
    id: 'AID-004',
    title: 'Water Sanitation Project',
    region: 'Southern District',
    amount: '5,000 EURC',
    recipients: 400,
    status: 'Expired',
    token: 'EURC',
  },
  {
    id: 'AID-005',
    title: 'Education Support',
    region: 'Western Highlands',
    amount: '15,000 USDC',
    recipients: 300,
    status: 'Active',
    token: 'USDC',
  },
  {
    id: 'AID-006',
    title: 'Child Nutrition Program',
    region: 'Central Valley',
    amount: '20,000 XLM',
    recipients: 180,
    status: 'Claimed',
    token: 'XLM',
  },
  {
    id: 'AID-007',
    title: 'Refugee Camp Support',
    region: 'Northern Zone',
    amount: '25,000 EURC',
    recipients: 600,
    status: 'Expired',
    token: 'EURC',
  },
  {
    id: 'AID-008',
    title: 'Disaster Recovery Aid',
    region: 'Eastern Region',
    amount: '50,000 USDC',
    recipients: 850,
    status: 'Active',
    token: 'USDC',
  },
];

const aidPackagesHandler: MockHandler = async (url) => {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    urlObj = new URL(url, 'http://localhost');
  }

  const search = urlObj.searchParams.get('search') ?? '';
  const status = urlObj.searchParams.get('status') ?? '';
  const token = urlObj.searchParams.get('token') ?? '';

  let results = [...ALL_PACKAGES];

  if (search) {
    const lower = search.toLowerCase();
    results = results.filter(
      p =>
        p.id.toLowerCase().includes(lower) ||
        p.title.toLowerCase().includes(lower) ||
        p.region.toLowerCase().includes(lower),
    );
  }

  if (status) {
    results = results.filter(p => p.status === status);
  }

  if (token) {
    results = results.filter(p => p.token === token);
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const handlers: Record<string, MockHandler> = {
  '/health': healthHandler,
  '/aid-packages': aidPackagesHandler,
};
