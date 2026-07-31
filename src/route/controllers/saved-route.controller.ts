import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { SavedRouteDetailResponseDto } from '@/route/dto/saved-route-detail-response.dto';
import { SavedRouteListResponseDto } from '@/route/dto/saved-route-list-response.dto';
import { SavedRouteService } from '@/route/services/saved-route.service';

@Controller('saved-routes')
@UseGuards(AuthGuard)
export class SavedRouteController {
  constructor(private readonly savedRouteService: SavedRouteService) {}

  @Get()
  async getSavedRouteList(
    @CurrentUser() user: User,
  ): Promise<SavedRouteListResponseDto> {
    return this.savedRouteService.getSavedRouteList(user.id);
  }

  @Get(':routeId')
  async getSavedRouteDetail(
    @Param('routeId') routeId: string,
    @CurrentUser() user: User,
  ): Promise<SavedRouteDetailResponseDto> {
    return this.savedRouteService.getSavedRouteDetail(routeId, user.id);
  }
}
