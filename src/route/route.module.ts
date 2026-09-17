import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { RouteController } from '@/route/controllers/route.controller';
import { SavedRouteController } from '@/route/controllers/saved-route.controller';
import { RouteRepository } from '@/route/repositories/route.repository';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';
import { KtoPlaceSyncService } from '@/route/services/kto-place-sync.service';
import { KtoRelatedPlaceSyncService } from '@/route/services/kto-related-place-sync.service';
import { RouteCongestionCronService } from '@/route/services/route-congestion-cron.service';
import { RouteService } from '@/route/services/route.service';
import { SavedRouteService } from '@/route/services/saved-route.service';

@Module({
  imports: [AuthModule],
  controllers: [RouteController, SavedRouteController],
  providers: [
    RouteService,
    RouteRepository,
    SavedRouteService,
    SavedRouteRepository,
    RouteCongestionCronService,
    KtoPlaceSyncService,
    KtoRelatedPlaceSyncService,
  ],
  exports: [
    RouteService,
    SavedRouteService,
    RouteCongestionCronService,
    KtoPlaceSyncService,
    KtoRelatedPlaceSyncService,
  ],
})
export class RouteModule {}
