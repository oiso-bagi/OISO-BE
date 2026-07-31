import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { BudgetRecommendRouteRequestDto } from '@/route/dto/budget-recommend-route-request.dto';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';
import { RouteService } from '@/route/services/route.service';

@Controller('recommended-routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) { }

  @Get()
  async getList(): Promise<RecommendedRouteListResponseDto[]> {
    return this.routeService.getRecommendedRouteList();
  }

  @Post('budget-recommend')
  @ApiOperation({
    summary: '예산/비율 기반 추천 루트 조회',
    description: [
      '총 예산과 비용 분배 비율, 선택 테마를 기준으로 추천 루트 Top 3를 조회합니다.',
      '',
      '기존 develop 브랜치의 예산 기반 추천 API를 URL 충돌 없이 복구한 엔드포인트입니다.',
      'POST /api/v1/recommended-routes/recommend 는 현재 여행 스타일/기간/1일 예산 기반 추천 API가 사용합니다.',
    ].join('\n'),
  })
  @ApiBody({
    type: BudgetRecommendRouteRequestDto,
    examples: {
      default: {
        summary: '예산 기반 추천 요청 예시',
        value: {
          budget: 100000,
          ratios: {
            foodRatio: 0.4,
            experienceRatio: 0.4,
            transportRatio: 0.2,
          },
          themeSlugs: ['local-food', 'photo-spot'],
        },
      },
    },
  })
  @ApiOkResponse({
    description:
      '예산과 선호 비율에 맞는 추천 루트 Top 3를 반환합니다. 조건에 맞는 루트가 없으면 빈 배열을 반환합니다.',
    type: [RecommendedRouteListResponseDto],
  })
  @ApiBadRequestResponse({
    description:
      '예산, 비율, 테마 slug 형식이 올바르지 않으면 400 응답을 반환합니다.',
  })
  async getBudgetRecommendedRoutes(
    @Body() body: unknown,
  ): Promise<RecommendedRouteListResponseDto[]> {
    const routes: RecommendedRouteListResponseDto[] =
      await this.routeService.getBudgetRecommendedRoutes(body);

    return routes;
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
