import { Controller, Get, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { SavingsDashboardResponseDto } from '@/dashboard/dto/savings-dashboard-response.dto';
import { DashboardService } from '@/dashboard/services/dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('savings')
  getSavingsDashboard(
    @CurrentUser() user: User,
  ): Promise<SavingsDashboardResponseDto> {
    return this.dashboardService.getSavingsDashboard(user.id);
  }
}
