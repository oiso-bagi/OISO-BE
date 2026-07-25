import { Controller, Get, Param, Query } from '@nestjs/common';
import { SavedRouteService } from './saved-route.service';
import { SavedRouteListResponseDto } from './dto/saved-route-list-response.dto';
import { SavedRouteDetailResponseDto } from './dto/saved-route-detail-response.dto';

@Controller('saved-routes')
export class SavedRouteController {
  constructor(private readonly savedRouteService: SavedRouteService) {}

  @Get()
  async getSavedRouteList(
    @Query('userId') userId?: string,
  ): Promise<SavedRouteListResponseDto> {
    return this.savedRouteService.getSavedRouteList(userId);
  }

  @Get(':routeId')
  async getSavedRouteDetail(
    @Param('routeId') routeId: string,
    @Query('userId') userId?: string,
  ): Promise<SavedRouteDetailResponseDto> {
    return this.savedRouteService.getSavedRouteDetail(routeId, userId);
  }
}
