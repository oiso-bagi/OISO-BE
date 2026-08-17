import { Module } from '@nestjs/common';
import { AdminContentController } from '@/admin/controllers/admin-content.controller';
import { AdminPlaceRepository } from '@/admin/repositories/admin-place.repository';
import { AdminRouteRepository } from '@/admin/repositories/admin-route.repository';
import { AdminContentService } from '@/admin/services/admin-content.service';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminContentController],
  providers: [AdminContentService, AdminRouteRepository, AdminPlaceRepository],
})
export class AdminModule {}
