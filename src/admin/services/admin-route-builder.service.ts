import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminRouteDetailResponseDto,
  CreateAdminRouteDto,
  UpdateAdminRouteDto,
} from '@/admin/dto/admin-route-builder.dto';
import { AdminPlaceRepository } from '@/admin/repositories/admin-place.repository';
import { AdminRouteBuilderRepository } from '@/admin/repositories/admin-route-builder.repository';

@Injectable()
export class AdminRouteBuilderService {
  constructor(
    private readonly adminRouteBuilderRepository: AdminRouteBuilderRepository,
    private readonly adminPlaceRepository: AdminPlaceRepository,
  ) {}

  async createRoute(
    dto: CreateAdminRouteDto,
  ): Promise<AdminRouteDetailResponseDto> {
    const themeId = await this.validateRouteContext(dto.themeSlug, dto.stops);
    const aggregates = await this.calculateRouteAggregates(dto.stops);
    return this.adminRouteBuilderRepository.createRoute(
      dto,
      themeId,
      aggregates,
    );
  }

  async getRouteDetail(id: string): Promise<AdminRouteDetailResponseDto> {
    const detail = await this.adminRouteBuilderRepository.findRouteDetail(id);
    if (!detail) {
      throw new NotFoundException('해당 추천 코스를 찾을 수 없습니다.');
    }
    return detail;
  }

  async updateRoute(
    id: string,
    dto: UpdateAdminRouteDto,
  ): Promise<AdminRouteDetailResponseDto> {
    const existing = await this.adminRouteBuilderRepository.findRouteDetail(id);
    if (!existing) {
      throw new NotFoundException('해당 추천 코스를 찾을 수 없습니다.');
    }

    const themeId = await this.validateRouteContext(dto.themeSlug, dto.stops);
    const aggregates = await this.calculateRouteAggregates(dto.stops);
    return this.adminRouteBuilderRepository.updateRoute(
      id,
      dto,
      themeId,
      aggregates,
    );
  }

  private async calculateRouteAggregates(stops: CreateAdminRouteDto['stops']) {
    const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
    const placeIds = Array.from(new Set(sortedStops.map((s) => s.placeId)));

    const places =
      await this.adminRouteBuilderRepository.findPlacesCoordinates(placeIds);
    const placeMap = new Map(places.map((p) => [p.id, p]));

    let totalDistanceMeters = 0;
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const s1 = sortedStops[i];
      const s2 = sortedStops[i + 1];

      const p1 = placeMap.get(s1.placeId);
      const p2 = placeMap.get(s2.placeId);
      if (p1?.latitude && p1?.longitude && p2?.latitude && p2?.longitude) {
        totalDistanceMeters += this.calculateDistanceMeters(
          Number(p1.latitude),
          Number(p1.longitude),
          Number(p2.latitude),
          Number(p2.longitude),
        );
      }
    }

    const totalDurationMin = sortedStops.reduce((acc, s, idx) => {
      const stay = s.stayTimeMinutes ?? 60;
      const travel =
        idx < sortedStops.length - 1 ? (s.nextTravelTimeMinutes ?? 0) : 0;
      return acc + stay + travel;
    }, 0);

    // 마지막 stop의 nextTravelCostWon은 합산에서 제외 (0부터 sortedStops.length - 2까지만 합산)
    let totalTransportCostWon = 0;
    for (let i = 0; i < sortedStops.length - 1; i++) {
      totalTransportCostWon += sortedStops[i].nextTravelCostWon ?? 0;
    }

    const stopData = sortedStops.map((stop, index) => {
      const prevStop = index > 0 ? sortedStops[index - 1] : null;
      return {
        placeId: stop.placeId,
        orderIndex: stop.sequence,
        stayMinutes: stop.stayTimeMinutes,
        travelMinutesFromPrev: prevStop?.nextTravelTimeMinutes ?? null,
        transitType: prevStop?.nextTransportType ?? null,
        fareWon: prevStop?.nextTravelCostWon ?? null,
        transitDetails: { dayNumber: stop.dayNumber },
      };
    });

    return {
      totalDistanceMeters,
      totalDurationMin,
      totalTransportCostWon,
      stopData,
    };
  }

  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private async validateRouteContext(
    themeSlug: string,
    stops: CreateAdminRouteDto['stops'],
  ): Promise<string> {
    // 1. 테마 존재 여부 사전 검증
    const themeId =
      await this.adminRouteBuilderRepository.findThemeIdBySlug(themeSlug);
    if (!themeId) {
      throw new BadRequestException(
        `유효하지 않은 테마 슬러그입니다: ${themeSlug}`,
      );
    }

    // 2. stops 존재 여부 검증
    if (!stops || stops.length === 0) {
      throw new BadRequestException(
        '최소 1개 이상의 경유 장소를 등록해야 합니다.',
      );
    }

    // 3. sequence 연속성 검증 (0, 1, 2...)
    const sortedSequences = stops.map((s) => s.sequence).sort((a, b) => a - b);
    for (let i = 0; i < sortedSequences.length; i++) {
      if (sortedSequences[i] !== i) {
        throw new BadRequestException(
          '경유 장소의 순서(sequence)는 0부터 시작하여 1씩 증가하는 연속된 정수여야 합니다.',
        );
      }
    }

    // 4. 장소 존재 여부 배치 검증
    const uniquePlaceIds = Array.from(new Set(stops.map((s) => s.placeId)));
    const existingPlaces =
      await this.adminPlaceRepository.findManyByIds(uniquePlaceIds);
    const existingPlaceIdSet = new Set(existingPlaces.map((p) => p.id));

    const missingIds = uniquePlaceIds.filter(
      (id) => !existingPlaceIdSet.has(id),
    );
    if (missingIds.length > 0) {
      throw new BadRequestException(
        `존재하지 않는 장소 ID가 포함되어 있습니다: ${missingIds.join(', ')}`,
      );
    }

    return themeId;
  }
}
