import { Prisma } from '@prisma/client';
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

    if (normalizedId.startsWith('stitched-')) {
      return this.getStitchedRouteDetail(normalizedId);
    }

    const routeRawData =
      await this.routeRepository.findDetailWithStopsAndPlace(normalizedId);

    if (!routeRawData) {
      throw new NotFoundException(
        `추천 루트 ID [${normalizedId}]를 찾을 수 없습니다.`,
      );
    }

    return RecommendedRouteDetailResponseDto.from(routeRawData);
  }

  private async getStitchedRouteDetail(
    stitchedId: string,
  ): Promise<RecommendedRouteDetailResponseDto> {
    const rawKey = stitchedId.slice('stitched-'.length);
    // '_' 기반 복수 ID 파싱 시도, 없을 경우 '-' 하이픈으로 분할하여 첫 번째 레코드 추출
    const componentIds = rawKey
      .split('_')
      .map((s) => s.trim())
      .filter(Boolean);

    if (componentIds.length === 0) {
      throw new BadRequestException(
        `stitched-route ID 파싱에 실패했습니다: [${stitchedId}]`,
      );
    }

    const routes = await this.routeRepository.findDetailsByIds(componentIds);

    if (!routes || routes.length === 0) {
      throw new NotFoundException(
        `추천 루트 ID [${stitchedId}]를 찾을 수 없습니다.`,
      );
    }

    // ID 순서대로 정렬 및 모든 Component ID 존재 여부 검증
    const routeMap = new Map(routes.map((r) => [r.id, r]));
    const orderedRoutes = componentIds
      .map((cid) => routeMap.get(cid))
      .filter((r): r is NonNullable<typeof r> => r != null);

    if (orderedRoutes.length !== componentIds.length) {
      throw new NotFoundException(
        `추천 루트 ID [${stitchedId}]를 구성하는 일부 루트를 찾을 수 없습니다.`,
      );
    }

    const targetRoutes = orderedRoutes;

    let cumulativeSequence = 0;
    const combinedStops: Array<
      (typeof targetRoutes)[number]['stops'][number] & {
        dayNumber: number;
      }
    > = [];

    targetRoutes.forEach((route, idx) => {
      const dayNum = idx + 1;
      const stops = route.stops || [];
      stops.forEach((stop) => {
        combinedStops.push({
          ...stop,
          orderIndex: cumulativeSequence++,
          dayNumber: dayNum,
        });
      });
    });

    const leadRoute = targetRoutes[0];
    const totalDistanceMeters = targetRoutes.reduce(
      (acc, r) => acc + (r.totalDistanceMeters ?? 0),
      0,
    );
    const estimatedSavingsWon = targetRoutes.reduce(
      (acc, r) => acc + (r.estimatedSavingsWon ?? 0),
      0,
    );
    const totalScore = targetRoutes.reduce(
      (acc, r) => acc + Number(r.score ?? 0),
      0,
    );
    const avgScore = Number((totalScore / targetRoutes.length).toFixed(2));
    const totalLocalContributionScore = targetRoutes.reduce(
      (acc, r) => acc + (r.localContributionScore ?? 0),
      0,
    );
    const avgLocalContributionScore = Math.round(
      totalLocalContributionScore / targetRoutes.length,
    );
    const durationDays = targetRoutes.length;
    const durationText = `${durationDays - 1}박 ${durationDays}일`;
    const spotNames = targetRoutes.map((r) => {
      const firstStopPlaceName = r.stops?.[0]?.place?.name;
      if (firstStopPlaceName) return firstStopPlaceName.trim();
      if (r.name) {
        return r.name
          .replace(/\[.*?\]/g, '')
          .replace(/릴레이\s*코스/g, '')
          .replace(/패키지(\s*\d+호)?/g, '')
          .replace(/코스/g, '')
          .trim();
      }
      return '부산';
    });

    const spot1 = spotNames[0] || '부산';
    let spot2 = spotNames[1] || '부산';
    if (spot1 === spot2 && targetRoutes[1]?.stops?.[1]?.place?.name) {
      spot2 = targetRoutes[1].stops[1].place.name.trim();
    }

    let packageName: string;
    if (durationDays <= 1) {
      packageName = String(leadRoute?.name || `${spot1} 코스`);
    } else if (durationDays === 2) {
      packageName = `[${durationText}] ${spot1} · ${spot2} 패키지`;
    } else {
      const extraCount = durationDays - 2;
      packageName = `[${durationText}] ${spot1} · ${spot2} 외 ${extraCount}곳 패키지`;
    }

    const combinedRouteRawData = {
      id: stitchedId,
      name: packageName,
      totalDistanceMeters,
      estimatedSavingsWon,
      score: new Prisma.Decimal(avgScore),
      routeType: leadRoute?.routeType || 'RECOMMENDED',
      congestionLevel: leadRoute?.congestionLevel || 'MEDIUM',
      localContributionScore: avgLocalContributionScore,
      stops: combinedStops,
    };

    return RecommendedRouteDetailResponseDto.from(combinedRouteRawData);
  }

  private validateRouteId(id: string): string {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new BadRequestException('추천 루트 ID는 비어 있을 수 없습니다.');
    }

    return id.trim();
  }
}
