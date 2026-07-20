import { Test, TestingModule } from '@nestjs/testing';
import { RouteRepository } from './route.repository';
import { RouteService } from './route.service';

describe('RouteService', () => {
  let service: RouteService;
  const mockRouteRepository = {
    findDetailWithStopsAndPlace: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        { provide: RouteRepository, useValue: mockRouteRepository },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
