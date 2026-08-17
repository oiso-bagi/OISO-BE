import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/auth/auth.module';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { ConsentModule } from '@/consent/consent.module';
import { DashboardModule } from '@/dashboard/dashboard.module';
import { HomeModule } from '@/home/home.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { RecommendationModule } from '@/recommendation/recommendation.module';
import { RouteModule } from '@/route/route.module';

import { AdminModule } from '@/admin/admin.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RouteModule,
    PrismaModule,
    AuthModule,
    ConsentModule,
    RecommendationModule,
    DashboardModule,
    HomeModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
