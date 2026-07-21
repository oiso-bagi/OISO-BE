import { Module } from '@nestjs/common';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { RouteRepository } from './route.repository';

@Module({
  controllers: [RouteController],
  providers: [RouteService, RouteRepository],
})
export class RouteModule {}
