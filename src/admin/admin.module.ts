import { Module } from '@nestjs/common';
import { AdminContentController } from '@/admin/controllers/admin-content.controller';
import { AdminRouteBuilderController } from '@/admin/controllers/admin-route-builder.controller';
import { AdminStatsController } from '@/admin/controllers/admin-stats.controller';
import { AdminPlaceRepository } from '@/admin/repositories/admin-place.repository';
import { AdminRouteBuilderRepository } from '@/admin/repositories/admin-route-builder.repository';
import { AdminRouteRepository } from '@/admin/repositories/admin-route.repository';
import { AdminStatsRepository } from '@/admin/repositories/admin-stats.repository';
import { AdminContentService } from '@/admin/services/admin-content.service';
import { AdminRouteBuilderService } from '@/admin/services/admin-route-builder.service';
import { AdminStatsService } from '@/admin/services/admin-stats.service';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RouteModule } from '@/route/route.module';

@Module({
  imports: [PrismaModule, AuthModule, RouteModule],
  controllers: [
    AdminContentController,
    AdminRouteBuilderController,
    AdminStatsController,
  ],
  providers: [
    AdminContentService,
    AdminRouteBuilderService,
    AdminStatsService,
    AdminRouteRepository,
    AdminPlaceRepository,
    AdminRouteBuilderRepository,
    AdminStatsRepository,
  ],
})
export class AdminModule {}
