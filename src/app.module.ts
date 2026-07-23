import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RouteModule } from './route/route.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConsentModule } from './consent/consent.module';

@Module({
  imports: [RouteModule, PrismaModule, AuthModule, ConsentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
