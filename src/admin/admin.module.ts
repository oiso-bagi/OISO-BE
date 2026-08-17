import { Module } from '@nestjs/common';
import { AdminContentController } from '@/admin/controllers/admin-content.controller';
import { AdminRouteBuilderController } from '@/admin/controllers/admin-route-builder.controller';
import { AdminPlaceRepository } from '@/admin/repositories/admin-place.repository';
import { AdminRouteBuilderRepository } from '@/admin/repositories/admin-route-builder.repository';
import { AdminRouteRepository } from '@/admin/repositories/admin-route.repository';
import { AdminContentService } from '@/admin/services/admin-content.service';
import { AdminRouteBuilderService } from '@/admin/services/admin-route-builder.service';
import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AdminContentController, AdminRouteBuilderController],
  providers: [
    AdminContentService,
    AdminRouteBuilderService,
    AdminRouteRepository,
    AdminPlaceRepository,
    AdminRouteBuilderRepository,
  ],
})
export class AdminModule {}
