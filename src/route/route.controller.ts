import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { RouteService } from './route.service';
import { RecommendedRouteDetailResponseDto } from './dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from './dto/recommended-route-list-response.dto';
import { RecommendRouteRequestDto } from './dto/recommend-route-request.dto';

@Controller('recommended-routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Get()
  async getList(): Promise<RecommendedRouteListResponseDto[]> {
    return this.routeService.getRecommendedRouteList();
  }

  @Post('recommend')
  async getRecommendedRoutes(@Body() dto: RecommendRouteRequestDto) {
    return this.routeService.getRecommendedRoutes(dto);
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
