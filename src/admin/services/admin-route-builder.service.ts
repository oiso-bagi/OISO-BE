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
    await this.validateRouteStops(dto.stops);
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

    await this.validateRouteStops(dto.stops);
    return this.adminRouteBuilderRepository.updateRoute(id, dto);
  }

  private async validateRouteStops(
    stops: CreateAdminRouteDto['stops'],
  ): Promise<void> {
    if (!stops || stops.length === 0) {
      throw new BadRequestException(
        '최소 1개 이상의 경유 장소를 등록해야 합니다.',
      );
    }

    // 1. sequence 연속성 검증 (1, 2, 3...)
    const sortedSequences = stops.map((s) => s.sequence).sort((a, b) => a - b);
    for (let i = 0; i < sortedSequences.length; i++) {
      if (sortedSequences[i] !== i + 1) {
        throw new BadRequestException(
          '경유 장소의 순서(sequence)는 1부터 시작하여 1씩 증가하는 연속된 정수여야 합니다.',
        );
      }
    }

    // 2. 장소 존재 여부 배치 검증
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
  }
}
