import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SavedRouteCompletionResponseDto } from '@/route/dto/saved-route-completion-response.dto';
import { SavedRouteDetailResponseDto } from '@/route/dto/saved-route-detail-response.dto';
import { SavedRouteListResponseDto } from '@/route/dto/saved-route-list-response.dto';
import { ToggleSavedRouteCompletionDto } from '@/route/dto/toggle-saved-route-completion.dto';
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

  async saveRoute(userId: string, routeId: string): Promise<void> {
    const normalizedUserId = this.validateUserId(userId);
    const normalizedRouteId = this.validateRouteId(routeId);

    const routeExists =
      await this.savedRouteRepository.findRouteById(normalizedRouteId);
    if (!routeExists) {
      throw new NotFoundException(
        `추천 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
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

    const alreadySaved = await this.savedRouteRepository.findSavedRoute(
      normalizedUserId,
      normalizedRouteId,
    );
    if (!alreadySaved) {
      throw new NotFoundException(
        `보관함에 저장된 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
    }

    await this.savedRouteRepository.deleteSavedRoute(
      normalizedUserId,
      normalizedRouteId,
    );
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

    const isSaved = await this.savedRouteRepository.findSavedRoute(
      normalizedUserId,
      normalizedRouteId,
    );
    if (!isSaved) {
      throw new NotFoundException(
        `보관함에 저장된 루트 ID [${normalizedRouteId}]를 찾을 수 없습니다.`,
      );
    }

    const updatedTrip =
      await this.savedRouteRepository.upsertRouteTripCompletion(
        normalizedUserId,
        normalizedRouteId,
        dto.isCompleted,
        dto.actualCostWon,
      );

    return SavedRouteCompletionResponseDto.from(updatedTrip);
  }

  private validateUserId(userId?: string): string {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('사용자 ID는 비어 있을 수 없습니다.');
    }

    return userId.trim();
  }
}
