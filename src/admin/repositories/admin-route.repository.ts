import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import { THEME_LABEL_MAP } from '@/admin/constants/admin-theme.constant';

@Injectable()
export class AdminRouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRoutes(params: {
    page: number;
    size: number;
    q?: string;
    theme?: string;
    isPublished?: boolean;
  }) {
    const { page, size, q, theme, isPublished } = params;
    const skip = (page - 1) * size;

    const where: Prisma.RouteWhereInput = {
      routeType: 'RECOMMENDED',
      ...(typeof isPublished === 'boolean' ? { isPublished } : {}),
      ...(q && q.trim().length > 0
        ? {
            name: {
              contains: q.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(theme && theme.trim().length > 0
        ? {
            themes: {
              some: {
                theme: {
                  slug: theme.trim(),
                },
              },
            },
          }
        : {}),
    };

    const [totalCount, routes] = await Promise.all([
      this.prisma.route.count({ where }),
      this.prisma.route.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          totalDistanceMeters: true,
          isPublished: true,
          createdAt: true,
          _count: {
            select: { stops: true },
          },
          themes: {
            take: 1,
            select: {
              theme: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items = routes.map((route) => {
      const firstTheme = route.themes[0]?.theme;
      const themeSlug = firstTheme?.slug ?? 'local-food';
      const themeLabel =
        THEME_LABEL_MAP[themeSlug] ?? firstTheme?.name ?? '추천 테마';

      return {
        id: route.id,
        name: route.name,
        theme: themeSlug,
        themeLabel,
        stopCount: route._count.stops,
        totalDistanceKm: Number((route.totalDistanceMeters / 1000).toFixed(1)),
        isPublished: route.isPublished,
        createdAt: route.createdAt,
      };
    });

    return { items, totalCount };
  }

  async updatePublishedStatus(id: string, isPublished: boolean) {
    const updated = await this.prisma.route.update({
      where: { id, routeType: 'RECOMMENDED' },
      data: { isPublished },
      select: {
        id: true,
        name: true,
        totalDistanceMeters: true,
        isPublished: true,
        createdAt: true,
        _count: {
          select: { stops: true },
        },
        themes: {
          take: 1,
          select: {
            theme: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const firstTheme = updated.themes[0]?.theme;
    const themeSlug = firstTheme?.slug ?? 'local-food';
    const themeLabel =
      THEME_LABEL_MAP[themeSlug] ?? firstTheme?.name ?? '추천 테마';

    return {
      id: updated.id,
      name: updated.name,
      theme: themeSlug,
      themeLabel,
      stopCount: updated._count.stops,
      totalDistanceKm: Number((updated.totalDistanceMeters / 1000).toFixed(1)),
      isPublished: updated.isPublished,
      createdAt: updated.createdAt,
    };
  }

  async findById(id: string) {
    return this.prisma.route.findFirst({
      where: { id, routeType: 'RECOMMENDED' },
      select: { id: true },
    });
  }
}
