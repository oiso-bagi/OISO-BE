import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { SavedRouteCompletionResponseDto } from '@/route/dto/saved-route-completion-response.dto';
import { SavedRouteDetailResponseDto } from '@/route/dto/saved-route-detail-response.dto';
import { SavedRouteListResponseDto } from '@/route/dto/saved-route-list-response.dto';
import { ToggleSavedRouteCompletionDto } from '@/route/dto/toggle-saved-route-completion.dto';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';

import { RouteService } from '@/route/services/route.service';

@Injectable()
export class SavedRouteService {
  constructor(
    private readonly savedRouteRepository: SavedRouteRepository,
    private readonly routeService: RouteService,
  ) {}

  async getSavedRouteList(userId: string): Promise<SavedRouteListResponseDto> {
    const normalizedUserId = this.validateUserId(userId);
    const rawList =
      await this.savedRouteRepository.findListByUserId(normalizedUserId);

    return SavedRouteListResponseDto.from(rawList);
  }

  private validateRouteId(routeId: string): string {
    if (typeof routeId !== 'string' || routeId.trim().length === 0) {
      throw new BadRequestException('저장된 루트 ID는 비어 있을 수 없습니다.');
    }

    return routeId.trim();
  }

  async getSavedRouteDetail(
    routeId: string,
    userId?: string,
  ): Promise<SavedRouteDetailResponseDto> {
    const normalizedRouteId = this.validateRouteId(routeId);
    const normalizedUserId = this.validateUserId(userId);

    const rawData = await this.savedRouteRepository.findDetailByRouteId(
      normalizedRouteId,
      normalizedUserId,
    );

    if (!rawData) {
      throw new NotFoundException(
        `저장된 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
    }

    return SavedRouteDetailResponseDto.from(rawData);
  }

  async saveRoute(userId: string, routeId: string): Promise<void> {
    const normalizedUserId = this.validateUserId(userId);
    let normalizedRouteId = this.validateRouteId(routeId);

    if (normalizedRouteId.startsWith('stitched-')) {
      const stitchedDetail: RecommendedRouteDetailResponseDto =
        await this.routeService.getRecommendedRouteDetail(normalizedRouteId);

      const rawStops = stitchedDetail.stops || [];
      const providedPlaceIds = rawStops
        .map((s) => (s as { placeId?: string }).placeId)
        .filter((id): id is string => Boolean(id));
      const placeNames = rawStops.map((s) => s.placeName).filter(Boolean);

      const places = await this.savedRouteRepository.findPlacesByIdsOrNames(
        providedPlaceIds,
        placeNames,
      );
      const placeIdSet = new Set(places.map((p) => p.id));

      // placeName 매핑 시 중복 이름으로 인한 잘못된 매핑 방지
      const placeNameCountMap = new Map<string, number>();
      const placeNameMap = new Map<string, string>();
      for (const p of places) {
        placeNameCountMap.set(p.name, (placeNameCountMap.get(p.name) ?? 0) + 1);
        placeNameMap.set(p.name, p.id);
      }

      const resolvedStops = rawStops.map((stop, idx) => {
        const stopPlaceId = (stop as { placeId?: string }).placeId;
        let resolvedPlaceId: string | undefined;

        if (stopPlaceId && placeIdSet.has(stopPlaceId)) {
          resolvedPlaceId = stopPlaceId;
        } else if (stop.placeName) {
          const nameCount = placeNameCountMap.get(stop.placeName) ?? 0;
          if (nameCount > 1) {
            throw new BadRequestException(
              `장소명 [${stop.placeName}]이(가) 여러 개 존재하여 명확하게 식별할 수 없습니다.`,
            );
          }
          resolvedPlaceId = placeNameMap.get(stop.placeName);
        }

        if (!resolvedPlaceId) {
          throw new NotFoundException(
            `스티칭 루트 저장 중 장소를 찾을 수 없습니다: [${stop.placeName || stopPlaceId}]`,
          );
        }

        return {
          placeId: resolvedPlaceId,
          orderIndex: stop.sequence ?? idx,
          dayNumber: stop.dayNumber ?? 1,
          transitType: stop.nextTransportType ?? null,
          travelMinutesFromPrev: stop.nextTravelTimeMinutes ?? null,
          stayMinutes: stop.stayMinutes ?? null,
        };
      });

      normalizedRouteId =
        await this.savedRouteRepository.ensureRouteExistsFromStitched(
          normalizedRouteId,
          {
            name: stitchedDetail.routeName || '',
            totalDistanceMeters:
              Math.round((stitchedDetail.totalDistanceKm || 0) * 1000) || 0,
            estimatedSavingsWon: stitchedDetail.savedCost || 0,
            score: stitchedDetail.recommendScore || 0,
            stops: resolvedStops,
          },
        );
    } else {
      const routeExists =
        await this.savedRouteRepository.findRouteById(normalizedRouteId);
      if (!routeExists) {
        throw new NotFoundException(
          `추천 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
        );
      }
    }

    const alreadySaved = await this.savedRouteRepository.findSavedRoute(
      normalizedUserId,
      normalizedRouteId,
    );
    if (alreadySaved) {
      return; // 이미 저장된 경우 멱등성 유지 (정상 처리)
    }

    await this.savedRouteRepository.createSavedRoute(
      normalizedUserId,
      normalizedRouteId,
    );
  }

  async deleteSavedRoute(userId: string, routeId: string): Promise<void> {
    const normalizedUserId = this.validateUserId(userId);
    const normalizedRouteId = this.validateRouteId(routeId);

    const result = await this.savedRouteRepository.deleteSavedRoute(
      normalizedUserId,
      normalizedRouteId,
    );

    if (result.count === 0) {
      throw new NotFoundException(
        `보관함에 저장된 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
    }
  }

  async toggleRouteCompletion(
    userId: string,
    routeId: string,
    dto: ToggleSavedRouteCompletionDto,
  ): Promise<SavedRouteCompletionResponseDto> {
    const normalizedUserId = this.validateUserId(userId);
    const normalizedRouteId = this.validateRouteId(routeId);

    const routeExists =
      await this.savedRouteRepository.findRouteById(normalizedRouteId);
    if (!routeExists) {
      throw new NotFoundException(
        `추천 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
    }

    const updatedTrip =
      await this.savedRouteRepository.upsertRouteTripCompletion(
        normalizedUserId,
        normalizedRouteId,
        dto.isCompleted,
        dto.actualCostWon,
      );

    if (!updatedTrip) {
      throw new NotFoundException(
        `보관함에 저장된 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
    }

    return SavedRouteCompletionResponseDto.from(updatedTrip);
  }

  private validateUserId(userId?: string): string {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('사용자 ID는 비어 있을 수 없습니다.');
    }

    return userId.trim();
  }
}
