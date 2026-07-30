import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { ConsentModule } from '@/consent/consent.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RecommendationModule } from '@/recommendation/recommendation.module';
import { RouteModule } from '@/route/route.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RouteModule,
    PrismaModule,
    AuthModule,
    ConsentModule,
    RecommendationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
