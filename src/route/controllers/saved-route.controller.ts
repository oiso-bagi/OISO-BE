import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import {
  ApiDeleteSavedRouteDocs,
  ApiGetSavedRouteDetailDocs,
  ApiGetSavedRouteListDocs,
  ApiSaveRouteDocs,
  ApiSavedRouteControllerDocs,
  ApiToggleSavedRouteCompletionDocs,
} from '@/route/docs/saved-route-swagger.docs';
import { CreateSavedRouteDto } from '@/route/dto/create-saved-route.dto';
import { SavedRouteCompletionResponseDto } from '@/route/dto/saved-route-completion-response.dto';
import { SavedRouteDetailResponseDto } from '@/route/dto/saved-route-detail-response.dto';
import { SavedRouteListResponseDto } from '@/route/dto/saved-route-list-response.dto';
import { ToggleSavedRouteCompletionDto } from '@/route/dto/toggle-saved-route-completion.dto';
import { SavedRouteService } from '@/route/services/saved-route.service';

@ApiSavedRouteControllerDocs()
@Controller('saved-routes')
@UseGuards(AuthGuard)
export class SavedRouteController {
  constructor(private readonly savedRouteService: SavedRouteService) {}

  @Get()
  @ApiGetSavedRouteListDocs()
  async getSavedRouteList(
    @CurrentUser() user: User,
  ): Promise<SavedRouteListResponseDto> {
    return this.savedRouteService.getSavedRouteList(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiSaveRouteDocs()
  async saveRoute(
    @Body() dto: CreateSavedRouteDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.savedRouteService.saveRoute(user.id, dto.routeId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteSavedRouteDocs()
  async deleteSavedRoute(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.savedRouteService.deleteSavedRoute(user.id, id);
  }

  @Patch(':routeId/completion')
  @HttpCode(HttpStatus.OK)
  @ApiToggleSavedRouteCompletionDocs()
  async toggleRouteCompletion(
    @Param('routeId') routeId: string,
    @Body() dto: ToggleSavedRouteCompletionDto,
    @CurrentUser() user: User,
  ): Promise<SavedRouteCompletionResponseDto> {
    return this.savedRouteService.toggleRouteCompletion(user.id, routeId, dto);
  }

  @Get(':routeId')
  @ApiGetSavedRouteDetailDocs()
  async getSavedRouteDetail(
    @Param('routeId') routeId: string,
    @CurrentUser() user: User,
  ): Promise<SavedRouteDetailResponseDto> {
    return this.savedRouteService.getSavedRouteDetail(routeId, user.id);
  }
}
