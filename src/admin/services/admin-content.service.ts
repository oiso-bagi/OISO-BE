import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AdminPlaceListQueryDto,
  AdminRouteListQueryDto,
} from '@/admin/dto/admin-list-query.dto';
import {
  AdminPageResponseDto,
  AdminPlaceListItemDto,
  AdminRouteListItemDto,
} from '@/admin/dto/admin-page-response.dto';
import {
  AdminTogglePlaceActiveDto,
  AdminToggleRoutePublishedDto,
} from '@/admin/dto/admin-toggle.dto';
import { AdminPlaceRepository } from '@/admin/repositories/admin-place.repository';
import { AdminRouteRepository } from '@/admin/repositories/admin-route.repository';

@Injectable()
export class AdminContentService {
  constructor(
    private readonly adminRouteRepository: AdminRouteRepository,
    private readonly adminPlaceRepository: AdminPlaceRepository,
  ) {}

  async getRoutes(
    query: AdminRouteListQueryDto,
  ): Promise<AdminPageResponseDto<AdminRouteListItemDto>> {
    const { items, totalCount } =
      await this.adminRouteRepository.findRoutes(query);
    return AdminPageResponseDto.of(items, query.page, query.size, totalCount);
  }

  async toggleRoutePublished(
    routeId: string,
    body: AdminToggleRoutePublishedDto,
  ): Promise<AdminRouteListItemDto> {
    const existing = await this.adminRouteRepository.findById(routeId);
    if (!existing) {
      throw new NotFoundException('해당 추천 코스를 찾을 수 없습니다.');
    }

    return this.adminRouteRepository.updatePublishedStatus(
      routeId,
      body.isPublished,
    );
  }

  async getPlaces(
    query: AdminPlaceListQueryDto,
  ): Promise<AdminPageResponseDto<AdminPlaceListItemDto>> {
    const { items, totalCount } =
      await this.adminPlaceRepository.findPlaces(query);
    return AdminPageResponseDto.of(items, query.page, query.size, totalCount);
  }

  async togglePlaceActive(
    placeId: string,
    body: AdminTogglePlaceActiveDto,
  ): Promise<AdminPlaceListItemDto> {
    const existing = await this.adminPlaceRepository.findById(placeId);
    if (!existing) {
      throw new NotFoundException('해당 장소를 찾을 수 없습니다.');
    }

    return this.adminPlaceRepository.updateActiveStatus(placeId, body.isActive);
  }
}
