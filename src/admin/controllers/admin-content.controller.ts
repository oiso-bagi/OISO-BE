import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAdminContentControllerDocs,
  ApiGetAdminPlacesDocs,
  ApiGetAdminRoutesDocs,
  ApiToggleAdminPlaceActiveDocs,
  ApiToggleAdminRoutePublishedDocs,
} from '@/admin/docs/admin-content-swagger.docs';
import {
  AdminPlaceListQueryDto,
  AdminRouteListQueryDto,
} from '@/admin/dto/admin-list-query.dto';
import {
  AdminPageResponseDto,
  AdminPlaceListItemDto,
  AdminRouteListItemDto,
} from '@/admin/dto/admin-page-response.dto';
import {
  AdminTogglePlaceActiveDto,
  AdminToggleRoutePublishedDto,
} from '@/admin/dto/admin-toggle.dto';
import { AdminContentService } from '@/admin/services/admin-content.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiAdminContentControllerDocs()
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Get('routes')
  @ApiGetAdminRoutesDocs()
  async getRoutes(
    @Query() query: AdminRouteListQueryDto,
  ): Promise<AdminPageResponseDto<AdminRouteListItemDto>> {
    return this.adminContentService.getRoutes(query);
  }

  @Patch('routes/:routeId/published')
  @HttpCode(HttpStatus.OK)
  @ApiToggleAdminRoutePublishedDocs()
  async toggleRoutePublished(
    @Param('routeId') routeId: string,
    @Body() body: AdminToggleRoutePublishedDto,
  ): Promise<AdminRouteListItemDto> {
    return this.adminContentService.toggleRoutePublished(routeId, body);
  }

  @Get('places')
  @ApiGetAdminPlacesDocs()
  async getPlaces(
    @Query() query: AdminPlaceListQueryDto,
  ): Promise<AdminPageResponseDto<AdminPlaceListItemDto>> {
    return this.adminContentService.getPlaces(query);
  }

  @Patch('places/:placeId/active')
  @HttpCode(HttpStatus.OK)
  @ApiToggleAdminPlaceActiveDocs()
  async togglePlaceActive(
    @Param('placeId') placeId: string,
    @Body() body: AdminTogglePlaceActiveDto,
  ): Promise<AdminPlaceListItemDto> {
    return this.adminContentService.togglePlaceActive(placeId, body);
  }
}
