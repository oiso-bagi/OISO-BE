import { Controller, Get, Query } from '@nestjs/common';
import { SavedRouteService } from './saved-route.service';
import { SavedRouteListResponseDto } from './dto/saved-route-list-response.dto';

@Controller('saved-routes')
export class SavedRouteController {
  constructor(private readonly savedRouteService: SavedRouteService) {}

  @Get()
  async getSavedRouteList(
    @Query('userId') userId?: string,
  ): Promise<SavedRouteListResponseDto> {
    return this.savedRouteService.getSavedRouteList(userId);
  }
}
