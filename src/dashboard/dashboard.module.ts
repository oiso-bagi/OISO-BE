import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { DashboardController } from '@/dashboard/controllers/dashboard.controller';
import { DashboardRepository } from '@/dashboard/repositories/dashboard.repository';
import { DashboardService } from '@/dashboard/services/dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository],
})
export class DashboardModule {}
