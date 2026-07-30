import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { ConsentModule } from '@/consent/consent.module';
import { DashboardModule } from '@/dashboard/dashboard.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RecommendationModule } from '@/recommendation/recommendation.module';
import { RouteModule } from '@/route/route.module';

@Module({
  imports: [
    RouteModule,
    PrismaModule,
    AuthModule,
    ConsentModule,
    RecommendationModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
