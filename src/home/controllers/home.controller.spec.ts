import { Test, TestingModule } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { HomeController } from '@/home/controllers/home.controller';
import { HomeService } from '@/home/services/home.service';
import { AuthGuard } from '@/common/guards/auth.guard';

describe('HomeController', () => {
  let controller: HomeController;
  const mockHomeService = {
    getHomeSummary: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: '테스트 유저',
    nickname: '테스터',
    provider: 'KAKAO',
    providerId: 'kakao-123',
    profileImageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [{ provide: HomeService, useValue: mockHomeService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HomeController>(HomeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates home summary retrieval to HomeService using current user ID', async () => {
    const mockSummary = {
      totalSavedSavingsWon: 35000,
      totalSavedCount: 2,
      savedRoutes: [],
    };
    mockHomeService.getHomeSummary.mockResolvedValue(mockSummary);

    const result = await controller.getHomeSummary(mockUser);

    expect(result).toBe(mockSummary);
    expect(mockHomeService.getHomeSummary).toHaveBeenCalledWith('user-1');
  });
});
