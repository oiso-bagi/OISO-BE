import { Injectable } from '@nestjs/common';
import { PlaceCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AdminPlaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPlaces(params: {
    page: number;
    size: number;
    q?: string;
    category?: string;
    isActive?: boolean;
  }) {
    const { page, size, q, category, isActive } = params;
    const skip = (page - 1) * size;

    let validCategory: PlaceCategory | undefined = undefined;
    if (category && category.trim().length > 0) {
      const upperCategory = category.trim().toUpperCase();
      if (
        Object.values(PlaceCategory).includes(upperCategory as PlaceCategory)
      ) {
        validCategory = upperCategory as PlaceCategory;
      }
    }

    const where: Prisma.PlaceWhereInput = {
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(validCategory ? { category: validCategory } : {}),
      ...(q && q.trim().length > 0
        ? {
            OR: [
              { name: { contains: q.trim(), mode: 'insensitive' } },
              { address: { contains: q.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [totalCount, places] = await Promise.all([
      this.prisma.place.count({ where }),
      this.prisma.place.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          address: true,
          category: true,
          elevationMeters: true,
          isActive: true,
          latitude: true,
          longitude: true,
        },
      }),
    ]);

    const items = places.map((place) => ({
      id: place.id,
      name: place.name,
      address: place.address ?? '',
      category: place.category,
      tpiScore:
        place.elevationMeters != null
          ? Number((place.elevationMeters * 0.01).toFixed(2))
          : null,
      isActive: place.isActive,
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
    }));

    return { items, totalCount };
  }

  async updateActiveStatus(id: string, isActive: boolean) {
    const updated = await this.prisma.place.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        address: true,
        category: true,
        elevationMeters: true,
        isActive: true,
        latitude: true,
        longitude: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      address: updated.address ?? '',
      category: updated.category,
      tpiScore:
        updated.elevationMeters != null
          ? Number((updated.elevationMeters * 0.01).toFixed(2))
          : null,
      isActive: updated.isActive,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
    };
  }

  async findById(id: string) {
    return this.prisma.place.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async findManyByIds(ids: string[]) {
    return this.prisma.place.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }
}
