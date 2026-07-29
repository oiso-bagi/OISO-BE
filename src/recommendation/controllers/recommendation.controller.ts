import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { RecommendRouteRequestDto } from '@/recommendation/dto/recommend-route-request.dto';
import { RecommendationOptionsResponseDto } from '@/recommendation/dto/recommendation-options-response.dto';
import { RecommendationService } from '@/recommendation/services/recommendation.service';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';

@Controller('recommended-routes')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('recommend/options')
  getOptions(): RecommendationOptionsResponseDto {
    return this.recommendationService.getOptions();
  }

  @Post('recommend')
  @HttpCode(200)
  recommendRoutes(
    @Body() body: RecommendRouteRequestDto,
  ): Promise<RecommendedRouteListResponseDto[]> {
    return this.recommendationService.recommendRoutes(body);
  }
}
