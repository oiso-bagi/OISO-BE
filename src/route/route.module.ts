import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { RouteRepository } from './route.repository';
import { SavedRouteController } from './saved-route.controller';
import { SavedRouteService } from './saved-route.service';
import { SavedRouteRepository } from './saved-route.repository';
import { RouteCongestionCronService } from './services/route-congestion-cron.service';

@Module({
  controllers: [RouteController, SavedRouteController],
  providers: [
    RouteService,
    RouteRepository,
    SavedRouteService,
    SavedRouteRepository,
    RouteCongestionCronService,
  ],
})
export class RouteModule {}
