import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiAdminContentControllerDocs } from '@/admin/docs/admin-content-swagger.docs';
import {
  ApiCreateAdminRouteDocs,
  ApiGetAdminRouteDetailDocs,
  ApiUpdateAdminRouteDocs,
} from '@/admin/docs/admin-route-builder-swagger.docs';
import {
  AdminRouteDetailResponseDto,
  CreateAdminRouteDto,
  UpdateAdminRouteDto,
} from '@/admin/dto/admin-route-builder.dto';
import { AdminRouteBuilderService } from '@/admin/services/admin-route-builder.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiAdminContentControllerDocs()
@Controller('admin/routes')
@UseGuards(AuthGuard)
export class AdminRouteBuilderController {
  constructor(
    private readonly adminRouteBuilderService: AdminRouteBuilderService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateAdminRouteDocs()
  async createRoute(
    @Body() body: CreateAdminRouteDto,
  ): Promise<AdminRouteDetailResponseDto> {
    return this.adminRouteBuilderService.createRoute(body);
  }

  @Get(':routeId')
  @ApiGetAdminRouteDetailDocs()
  async getRouteDetail(
    @Param('routeId') routeId: string,
  ): Promise<AdminRouteDetailResponseDto> {
    return this.adminRouteBuilderService.getRouteDetail(routeId);
  }

  @Put(':routeId')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateAdminRouteDocs()
  async updateRoute(
    @Param('routeId') routeId: string,
    @Body() body: UpdateAdminRouteDto,
  ): Promise<AdminRouteDetailResponseDto> {
    return this.adminRouteBuilderService.updateRoute(routeId, body);
  }
}
