import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { RouteService } from './route.service';
import { RecommendedRouteDetailResponseDto } from './dto/recommended-route-detail-response.dto';

@Controller('recommended-routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

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
