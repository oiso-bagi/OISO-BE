import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';
import { RouteService } from '@/route/services/route.service';

@Controller('api/v1/recommended-routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  async getList(): Promise<RecommendedRouteListResponseDto[]> {
    return this.routeService.getRecommendedRouteList();
  }

  @Get(':id')
  async getDetail(
    @Param('id') id: string,
  ): Promise<RecommendedRouteDetailResponseDto> {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new BadRequestException('추천 루트 ID는 비어 있을 수 없습니다.');
    }

    return this.routeService.getRecommendedRouteDetail(id.trim());
  }
}
