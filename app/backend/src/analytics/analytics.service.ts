import { Injectable } from '@nestjs/common';

export type MapDataPoint = {
  id: string;
  lat: number;
  lng: number;
  amount: number;
  token: string;
  status: string;
};

@Injectable()
export class AnalyticsService {
  getMapData(): MapDataPoint[] {
    return [
      {
        id: 'pkg-001',
        lat: 6.5244,
        lng: 3.3792,
        amount: 250,
        token: 'USDC',
        status: 'delivered',
      },
      {
        id: 'pkg-002',
        lat: 9.0765,
        lng: 7.3986,
        amount: 120,
        token: 'USDC',
        status: 'pending',
      },
      {
        id: 'pkg-003',
        lat: -1.286389,
        lng: 36.817223,
        amount: 560,
        token: 'XLM',
        status: 'in_transit',
      },
      {
        id: 'pkg-004',
        lat: 14.716677,
        lng: -17.467686,
        amount: 90,
        token: 'USDC',
        status: 'delivered',
      },
      {
        id: 'pkg-005',
        lat: -26.204103,
        lng: 28.047305,
        amount: 310,
        token: 'XLM',
        status: 'delivered',
      },
    ];
  }
}
