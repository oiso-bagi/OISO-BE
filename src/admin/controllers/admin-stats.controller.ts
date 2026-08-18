import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAdminStatsControllerDocs,
  ApiCollectAdminKtoDocs,
  ApiGetAdminKtoStatusDocs,
  ApiGetAdminSavingsBreakdownDocs,
  ApiGetAdminStatsOverviewDocs,
} from '@/admin/docs/admin-stats-swagger.docs';
import {
  AdminKtoCollectResponseDto,
  AdminKtoStatusResponseDto,
} from '@/admin/dto/admin-kto-status-response.dto';
import {
  AdminSavingsBreakdownResponseDto,
  AdminStatsOverviewResponseDto,
} from '@/admin/dto/admin-stats-response.dto';
import { AdminStatsService } from '@/admin/services/admin-stats.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiAdminStatsControllerDocs()
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  @Get('stats/overview')
  @ApiGetAdminStatsOverviewDocs()
  async getStatsOverview(): Promise<AdminStatsOverviewResponseDto> {
    return this.adminStatsService.getStatsOverview();
  }

  @Get('stats/savings-breakdown')
  @ApiGetAdminSavingsBreakdownDocs()
  async getSavingsBreakdown(): Promise<AdminSavingsBreakdownResponseDto> {
    return this.adminStatsService.getSavingsBreakdown();
  }

  @Get('kto/status')
  @ApiGetAdminKtoStatusDocs()
  async getKtoStatus(): Promise<AdminKtoStatusResponseDto> {
    return this.adminStatsService.getKtoStatus();
  }

  @Post('kto/collect')
  @HttpCode(HttpStatus.OK)
  @ApiCollectAdminKtoDocs()
  async triggerKtoCollection(): Promise<AdminKtoCollectResponseDto> {
    return this.adminStatsService.triggerKtoCollection();
  }
}
