import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SavedRouteRepository } from './saved-route.repository';
import { SavedRouteListResponseDto } from './dto/saved-route-list-response.dto';
import { SavedRouteDetailResponseDto } from './dto/saved-route-detail-response.dto';

@Injectable()
export class SavedRouteService {
  constructor(private readonly savedRouteRepository: SavedRouteRepository) {}

  async getSavedRouteList(userId?: string): Promise<SavedRouteListResponseDto> {
    const rawList = await this.savedRouteRepository.findListByUserId(userId);
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

    const rawData = await this.savedRouteRepository.findDetailByRouteId(
      normalizedRouteId,
      userId,
    );

    if (!rawData) {
      throw new NotFoundException(
        `저장된 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
    }

    return SavedRouteDetailResponseDto.from(rawData);
  }
}
