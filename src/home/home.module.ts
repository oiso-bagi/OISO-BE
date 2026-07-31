import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { HomeController } from '@/home/controllers/home.controller';
import { HomeRepository } from '@/home/repositories/home.repository';
import { HomeService } from '@/home/services/home.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HomeController],
  providers: [HomeService, HomeRepository],
  exports: [HomeService],
})
export class HomeModule {}
