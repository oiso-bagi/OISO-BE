import { Module } from '@nestjs/common';
import { RecommendationController } from '@/recommendation/controllers/recommendation.controller';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';
import { RecommendationService } from '@/recommendation/services/recommendation.service';

@Module({
  controllers: [RecommendationController],
  providers: [RecommendationService, RecommendationRepository],
})
export class RecommendationModule {}
