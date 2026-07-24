import { Injectable } from '@nestjs/common';
import { SavedRouteRepository } from './saved-route.repository';
import { SavedRouteListResponseDto } from './dto/saved-route-list-response.dto';

@Injectable()
export class SavedRouteService {
  constructor(private readonly savedRouteRepository: SavedRouteRepository) {}

  async getSavedRouteList(userId?: string): Promise<SavedRouteListResponseDto> {
    const rawList = await this.savedRouteRepository.findListByUserId(userId);
    return SavedRouteListResponseDto.from(rawList);
  }
}
