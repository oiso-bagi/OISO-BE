import { Test, TestingModule } from '@nestjs/testing';
import { SavedRouteController } from './saved-route.controller';
import { SavedRouteService } from './saved-route.service';

describe('SavedRouteController', () => {
  let controller: SavedRouteController;
  const mockSavedRouteService = {
    getSavedRouteList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedRouteController],
      providers: [
        { provide: SavedRouteService, useValue: mockSavedRouteService },
      ],
    }).compile();

    controller = module.get<SavedRouteController>(SavedRouteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates to SavedRouteService.getSavedRouteList', async () => {
    const mockResponse = {
      savedRouteCount: 1,
      totalSavedSavingsWon: 1000,
      savedRoutes: [],
    };

    mockSavedRouteService.getSavedRouteList.mockResolvedValue(mockResponse);

    const result = await controller.getSavedRouteList('user-1');

    expect(mockSavedRouteService.getSavedRouteList).toHaveBeenCalledWith(
      'user-1',
    );
    expect(result).toBe(mockResponse);
  });
});
