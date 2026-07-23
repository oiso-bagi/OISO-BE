import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RouteRepository } from './route.repository';

describe('RouteRepository', () => {
  let repository: RouteRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteRepository,
        {
          provide: PrismaService,
          useValue: {
            route: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<RouteRepository>(RouteRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
