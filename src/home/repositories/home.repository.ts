import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class HomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSavedRoutesByUserId(userId: string) {
    return this.prisma.savedRoute.findMany({
      where: { userId },
      select: {
        userId: true,
        routeId: true,
        savedAt: true,
        route: {
          select: {
            id: true,
            name: true,
            estimatedSavingsWon: true,
            totalDistanceMeters: true,
          },
        },
      },
      orderBy: { savedAt: 'desc' },
    });
  }
}
