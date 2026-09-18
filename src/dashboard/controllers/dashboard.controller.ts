import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  ApiDashboardControllerDocs,
  ApiGetSavingsDashboardDocs,
  ApiGetSavingsHistoriesDocs,
} from '@/dashboard/docs/dashboard-swagger.docs';
import {
  SavingsDashboardResponseDto,
  SavingsHistoriesPageResponseDto,
  SavingsHistoriesQueryDto,
} from '@/dashboard/dto/savings-dashboard-response.dto';
import { DashboardService } from '@/dashboard/services/dashboard.service';

@ApiDashboardControllerDocs()
@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('savings')
  @ApiGetSavingsDashboardDocs()
  getSavingsDashboard(
    @CurrentUser() user: User,
  ): Promise<SavingsDashboardResponseDto> {
    return this.dashboardService.getSavingsDashboard(user.id);
  }

  @Get('savings/histories')
  @ApiGetSavingsHistoriesDocs()
  getSavingsHistories(
    @CurrentUser() user: User,
    @Query() query: SavingsHistoriesQueryDto,
  ): Promise<SavingsHistoriesPageResponseDto> {
    return this.dashboardService.getSavingsHistories(user.id, query);
  }
}
