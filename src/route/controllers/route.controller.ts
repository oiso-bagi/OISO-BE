import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiGetBudgetRecommendedRoutesDocs,
  ApiGetRecommendedRouteDetailDocs,
  ApiGetRecommendedRouteListDocs,
  ApiRouteControllerDocs,
} from '@/route/docs/route-swagger.docs';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';
import { RouteService } from '@/route/services/route.service';

@ApiRouteControllerDocs()
@Controller('recommended-routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  @ApiGetRecommendedRouteListDocs()
  async getList(): Promise<RecommendedRouteListResponseDto[]> {
    return this.routeService.getRecommendedRouteList();
  }

  @Post('budget-recommend')
  @ApiGetBudgetRecommendedRoutesDocs()
  async getBudgetRecommendedRoutes(
    @Body() body: unknown,
  ): Promise<RecommendedRouteListResponseDto[]> {
    const routes: RecommendedRouteListResponseDto[] =
      await this.routeService.getBudgetRecommendedRoutes(body);

    return routes;
  }

  @Get(':id')
  @ApiGetRecommendedRouteDetailDocs()
  async getDetail(
    @Param('id') id: string,
  ): Promise<RecommendedRouteDetailResponseDto> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new BadRequestException('추천 루트 ID는 비어 있을 수 없습니다.');
    }

    return this.routeService.getRecommendedRouteDetail(id.trim());
  }
}
