import { Controller, Get, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { API_VERSIONS } from '../common/constants/api-version.constants';
import { Public } from '../common/decorators/public.decorator';
import { AnalyticsService, MapDataPoint } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get('map-data')
  @Version(API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get anonymized distribution data for the global dashboard map',
  })
  @ApiOkResponse({
    description: 'List of anonymized aid package distribution points.',
    schema: {
      example: [
        {
          id: 'pkg-001',
          lat: 6.5244,
          lng: 3.3792,
          amount: 250,
          token: 'USDC',
          status: 'delivered',
        },
      ],
    },
  })
  getMapData(): MapDataPoint[] {
    return this.analyticsService.getMapData();
  }
}
