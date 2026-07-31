import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';
import { RouteRepository } from '@/route/repositories/route.repository';

@Injectable()
export class RouteService {
  constructor(private readonly routeRepository: RouteRepository) {}

  async getRecommendedRouteList(): Promise<RecommendedRouteListResponseDto[]> {
    const routeRawDataList = await this.routeRepository.findListWithStops();

    return routeRawDataList.map((routeRawData) =>
      RecommendedRouteListResponseDto.from(routeRawData),
    );
  }

  async getRecommendedRouteDetail(
    id: string,
  ): Promise<RecommendedRouteDetailResponseDto> {
    const normalizedId = this.validateRouteId(id);

    const routeRawData =
      await this.routeRepository.findDetailWithStopsAndPlace(normalizedId);

    if (!routeRawData) {
      throw new NotFoundException(
        `추천 루트 ID [${normalizedId}]를 찾을 수 없습니다.`,
      );
    }

    return RecommendedRouteDetailResponseDto.from(routeRawData);
  }

  private validateRouteId(id: string): string {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new BadRequestException('추천 루트 ID는 비어 있을 수 없습니다.');
    }

    return id.trim();
  }
}
