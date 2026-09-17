import { Test, TestingModule } from '@nestjs/testing';
import {
  CongestionLevel,
  PlaceCategory,
  Prisma,
  RouteType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RouteRepository } from '@/route/repositories/route.repository';

describe('RouteRepository', () => {
  let repository: RouteRepository;
  let mockPrismaPlaceUpsert: jest.Mock;
  let prismaService: {
    route: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    place: {
      upsert: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockPrismaPlaceUpsert = jest.fn();
    prismaService = {
      route: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      place: {
        upsert: mockPrismaPlaceUpsert,
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteRepository,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<RouteRepository>(RouteRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('upsertPlaceFromKto preserves isActive and elevationMeters on update', async () => {
    const mockPlace = { id: 'place-1' };
    mockPrismaPlaceUpsert.mockResolvedValue(mockPlace);

    const data = {
      name: '광안리',
      address: '수영구',
      roadAddress: null,
      region: '부산광역시',
      district: '수영구',
      category: PlaceCategory.NATURE,
      latitude: new Prisma.Decimal(35.15),
      longitude: new Prisma.Decimal(129.11),
      elevationMeters: 15,
      openTime: '09:00',
      closeTime: '18:00',
      isActive: true,
    };

    await repository.upsertPlaceFromKto('kto-100', data);

    expect(mockPrismaPlaceUpsert).toHaveBeenCalledWith({
      where: { apiSourceId: 'kto-100' },
      update: {
        name: '광안리',
        address: '수영구',
        roadAddress: null,
        region: '부산광역시',
        district: '수영구',
        category: PlaceCategory.NATURE,
        latitude: new Prisma.Decimal(35.15),
        longitude: new Prisma.Decimal(129.11),
        openTime: '09:00',
        closeTime: '18:00',
      },
      create: {
        apiSourceId: 'kto-100',
        name: '광안리',
        address: '수영구',
        roadAddress: null,
        region: '부산광역시',
        district: '수영구',
        category: PlaceCategory.NATURE,
        latitude: new Prisma.Decimal(35.15),
        longitude: new Prisma.Decimal(129.11),
        openTime: '09:00',
        closeTime: '18:00',
        isActive: true,
        elevationMeters: 15,
      },
    });
  });

  it('upsertPlaceFromKto preserves existing openTime and closeTime on update when null', async () => {
    const mockPlace = { id: 'place-2' };
    mockPrismaPlaceUpsert.mockResolvedValue(mockPlace);

    const data = {
      name: '해운대',
      address: '해운대구',
      roadAddress: null,
      region: '부산광역시',
      district: '해운대구',
      category: PlaceCategory.NATURE,
      latitude: new Prisma.Decimal(35.15),
      longitude: new Prisma.Decimal(129.11),
      elevationMeters: 15,
      openTime: null,
      closeTime: null,
      isActive: true,
    };

    await repository.upsertPlaceFromKto('kto-200', data);

    expect(mockPrismaPlaceUpsert).toHaveBeenCalledWith({
      where: { apiSourceId: 'kto-200' },
      update: {
        name: '해운대',
        address: '해운대구',
        roadAddress: null,
        region: '부산광역시',
        district: '해운대구',
        category: PlaceCategory.NATURE,
        latitude: new Prisma.Decimal(35.15),
        longitude: new Prisma.Decimal(129.11),
        // openTime, closeTime are omitted from update to preserve existing DB values!
      },
      create: {
        apiSourceId: 'kto-200',
        name: '해운대',
        address: '해운대구',
        roadAddress: null,
        region: '부산광역시',
        district: '해운대구',
        category: PlaceCategory.NATURE,
        latitude: new Prisma.Decimal(35.15),
        longitude: new Prisma.Decimal(129.11),
        openTime: null,
        closeTime: null,
        isActive: true,
        elevationMeters: 15,
      },
    });
  });

  describe('findPlaceByName', () => {
    it('returns null if empty name', async () => {
      expect(await repository.findPlaceByName('  ')).toBeNull();
    });

    it('prioritizes exact match', async () => {
      const mockExact = { id: 'p-1', name: '해운대' };
      prismaService.place.findFirst.mockResolvedValueOnce(mockExact);

      const result = await repository.findPlaceByName('해운대');

      expect(result).toBe(mockExact);
      expect(prismaService.place.findFirst).toHaveBeenCalledWith({
        where: { name: '해운대', isActive: true },
      });
    });

    it('falls back to startsWith and contains if exact match not found', async () => {
      const mockStartsWith = { id: 'p-2', name: '해운대 해수욕장' };
      prismaService.place.findFirst
        .mockResolvedValueOnce(null) // exact match 실패
        .mockResolvedValueOnce(mockStartsWith); // startsWith 성공

      const result = await repository.findPlaceByName('해운대');

      expect(result).toBe(mockStartsWith);
      expect(prismaService.place.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  it('calls prisma.route.findListWithStops with RECOMMENDED routeType filter and returns result', async () => {
    const mockList = [{ id: 'route-1', name: '부산 야경 루트' }];
    prismaService.route.findMany.mockResolvedValue(mockList);

    const result: unknown = await repository.findListWithStops();

    expect(result).toBe(mockList);
    expect(prismaService.route.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { routeType: RouteType.RECOMMENDED, isPublished: true },
      }),
    );
  });

  it('calls prisma.route.findDetailWithStopsAndPlace with id and returns result', async () => {
    const mockDetail = { id: 'route-1', name: '부산 야경 루트' };
    prismaService.route.findUnique.mockResolvedValue(mockDetail);

    const result: unknown =
      await repository.findDetailWithStopsAndPlace('route-1');

    expect(result).toBe(mockDetail);
    expect(prismaService.route.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'route-1' },
      }),
    );
  });

  it('updates route congestion level by id', async () => {
    const updated = { id: 'route-1', congestionLevel: CongestionLevel.LOW };
    prismaService.route.update.mockResolvedValue(updated);

    await expect(
      repository.updateRouteCongestionLevel('route-1', CongestionLevel.LOW),
    ).resolves.toBe(updated);

    expect(prismaService.route.update).toHaveBeenCalledWith({
      where: { id: 'route-1' },
      data: { congestionLevel: CongestionLevel.LOW },
    });
  });
});
