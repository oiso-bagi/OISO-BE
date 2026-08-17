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
    await this.validateRouteStops(dto.stops, dto.durationDays);
    return this.adminRouteBuilderRepository.createRoute(dto);
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

    await this.validateRouteStops(dto.stops, dto.durationDays);
    return this.adminRouteBuilderRepository.updateRoute(id, dto);
  }

  private async validateRouteStops(
    stops: CreateAdminRouteDto['stops'],
    durationDays: number,
  ): Promise<void> {
    if (!stops || stops.length === 0) {
      throw new BadRequestException(
        '최소 1개 이상의 경유 장소를 등록해야 합니다.',
      );
    }

    // 1. dayNumber 범위 검증
    for (const stop of stops) {
      if (stop.dayNumber > durationDays) {
        throw new BadRequestException(
          `경유 장소의 여행 일차(${stop.dayNumber}일차)가 전체 소요 일수(${durationDays}일)를 초과합니다.`,
        );
      }
    }

    // 2. sequence 연속성 검증 (1, 2, 3...)
    const sortedSequences = stops.map((s) => s.sequence).sort((a, b) => a - b);
    for (let i = 0; i < sortedSequences.length; i++) {
      if (sortedSequences[i] !== i + 1) {
        throw new BadRequestException(
          '경유 장소의 순서(sequence)는 1부터 시작하여 1씩 증가하는 연속된 정수여야 합니다.',
        );
      }
    }

    // 3. 장소 존재 여부 검증
    for (const stop of stops) {
      const place = await this.adminPlaceRepository.findById(stop.placeId);
      if (!place) {
        throw new NotFoundException(
          `ID가 '${stop.placeId}'인 장소를 찾을 수 없습니다.`,
        );
      }
    }
  }
}
