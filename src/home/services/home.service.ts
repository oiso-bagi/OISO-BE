import { Injectable } from '@nestjs/common';
import { HomeSummaryResponseDto } from '@/home/dto/home-summary-response.dto';
import { SavedRouteSummaryItemDto } from '@/home/dto/saved-route-summary-item.dto';
import { HomeRepository } from '@/home/repositories/home.repository';

@Injectable()
export class HomeService {
  constructor(private readonly homeRepository: HomeRepository) {}

  async getHomeSummary(userId: string): Promise<HomeSummaryResponseDto> {
    const rawSavedRoutes =
      await this.homeRepository.findSavedRoutesByUserId(userId);

    const savedRouteItems = rawSavedRoutes.map((item) =>
      SavedRouteSummaryItemDto.from(item),
    );

    const totalSavedSavingsWon = savedRouteItems.reduce(
      (sum, item) => sum + item.savingsWon,
      0,
    );

    return HomeSummaryResponseDto.from(totalSavedSavingsWon, savedRouteItems);
  }
}
