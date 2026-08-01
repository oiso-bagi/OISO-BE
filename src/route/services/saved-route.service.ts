import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SavedRouteDetailResponseDto } from '@/route/dto/saved-route-detail-response.dto';
import { SavedRouteListResponseDto } from '@/route/dto/saved-route-list-response.dto';
import { SavedRouteRepository } from '@/route/repositories/saved-route.repository';

@Injectable()
export class SavedRouteService {
  constructor(private readonly savedRouteRepository: SavedRouteRepository) {}

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

  private validateUserId(userId?: string): string {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('사용자 ID는 비어 있을 수 없습니다.');
    }

    return userId.trim();
  }
}
