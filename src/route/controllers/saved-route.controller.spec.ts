import { Test, TestingModule } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { AuthGuard } from '@/common/guards/auth.guard';
import { SavedRouteController } from '@/route/controllers/saved-route.controller';
import { SavedRouteService } from '@/route/services/saved-route.service';

describe('SavedRouteController', () => {
  let controller: SavedRouteController;
  const mockSavedRouteService = {
    getSavedRouteList: jest.fn(),
    getSavedRouteDetail: jest.fn(),
    saveRoute: jest.fn(),
    deleteSavedRoute: jest.fn(),
    toggleRouteCompletion: jest.fn(),
  };
  const user = { id: 'user-1' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedRouteController],
      providers: [
        { provide: SavedRouteService, useValue: mockSavedRouteService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SavedRouteController>(SavedRouteController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates to SavedRouteService.getSavedRouteList with current user id', async () => {
    const mockResponse = {
      savedRouteCount: 1,
      totalSavedSavingsWon: 1000,
      savedRoutes: [],
    };

    mockSavedRouteService.getSavedRouteList.mockResolvedValue(mockResponse);

    const result = await controller.getSavedRouteList(user);

    expect(mockSavedRouteService.getSavedRouteList).toHaveBeenCalledWith(
      'user-1',
    );
    expect(result).toBe(mockResponse);
  });

  it('delegates to SavedRouteService.saveRoute with current user id and routeId', async () => {
    mockSavedRouteService.saveRoute.mockResolvedValue(undefined);

    await controller.saveRoute({ routeId: 'route-1' }, user);

    expect(mockSavedRouteService.saveRoute).toHaveBeenCalledWith(
      'user-1',
      'route-1',
    );
  });

  it('delegates to SavedRouteService.deleteSavedRoute with current user id and routeId', async () => {
    mockSavedRouteService.deleteSavedRoute.mockResolvedValue(undefined);

    await controller.deleteSavedRoute('route-1', user);

    expect(mockSavedRouteService.deleteSavedRoute).toHaveBeenCalledWith(
      'user-1',
      'route-1',
    );
  });

  it('delegates to SavedRouteService.getSavedRouteDetail with current user id', async () => {
    const mockResponse = {
      routeId: 'route-1',
      routeName: '부산 해운대 코스',
    };

    mockSavedRouteService.getSavedRouteDetail.mockResolvedValue(mockResponse);

    const result = await controller.getSavedRouteDetail('route-1', user);

    expect(mockSavedRouteService.getSavedRouteDetail).toHaveBeenCalledWith(
      'route-1',
      'user-1',
    );
    expect(result).toBe(mockResponse);
  });

  it('delegates to SavedRouteService.toggleRouteCompletion with routeId and dto', async () => {
    const mockDto = { isCompleted: true, actualCostWon: 45000 };
    const mockResponse = {
      routeId: 'route-1',
      isCompleted: true,
      actualCostWon: 45000,
    };

    mockSavedRouteService.toggleRouteCompletion.mockResolvedValue(mockResponse);

    const result = await controller.toggleRouteCompletion(
      'route-1',
      mockDto,
      user,
    );

    expect(mockSavedRouteService.toggleRouteCompletion).toHaveBeenCalledWith(
      'user-1',
      'route-1',
      mockDto,
    );
    expect(result).toBe(mockResponse);
  });
});
