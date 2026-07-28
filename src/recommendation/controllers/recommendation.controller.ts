import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { RecommendationPreferenceResponseDto } from '@/recommendation/dto/recommendation-preference-response.dto';
import { RecommendationOptionsResponseDto } from '@/recommendation/dto/recommendation-options-response.dto';
import { SubmitRecommendationPreferenceRequestDto } from '@/recommendation/dto/submit-recommendation-preference-request.dto';
import { RecommendationService } from '@/recommendation/services/recommendation.service';

@Controller('api/v1/recommendation-preferences')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('options')
  getOptions(): RecommendationOptionsResponseDto {
    return this.recommendationService.getOptions();
  }

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(200)
  submitPreference(
    @CurrentUser() user: User,
    @Body() body: SubmitRecommendationPreferenceRequestDto,
  ): Promise<RecommendationPreferenceResponseDto> {
    const preferenceResponse: Promise<RecommendationPreferenceResponseDto> =
      this.recommendationService.submitPreference(user.id, body);

    return preferenceResponse;
  }
}
