import { Test, TestingModule } from '@nestjs/testing';
import { PlaceCategory } from '@prisma/client';
import axios from 'axios';
import { RouteRepository } from '@/route/repositories/route.repository';
import {
  KtoPlaceSyncService,
  mapItemToCategory,
  parseTimeString,
} from '@/route/services/kto-place-sync.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KtoPlaceSyncService', () => {
  let service: KtoPlaceSyncService;
  const routeRepositoryMock = {
    upsertPlaceFromKto: jest.fn(),
    countPlaces: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.VK_KORSERVICE2_API_KEY = 'test_key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KtoPlaceSyncService,
        { provide: RouteRepository, useValue: routeRepositoryMock },
      ],
    }).compile();

    service = module.get<KtoPlaceSyncService>(KtoPlaceSyncService);
  });

  afterEach(() => {
    delete process.env.VK_KORSERVICE2_API_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapItemToCategory', () => {
    it('maps viewpoint correctly', () => {
      expect(mapItemToCategory({ title: '황령산 전망대' })).toBe(
        PlaceCategory.VIEWPOINT,
      );
    });

    it('maps cafe correctly', () => {
      expect(mapItemToCategory({ title: '오션뷰 카페' })).toBe(
        PlaceCategory.CAFE,
      );
    });

    it('maps market correctly', () => {
      expect(
        mapItemToCategory({ contenttypeid: '38', title: '자갈치시장' }),
      ).toBe(PlaceCategory.MARKET);
    });

    it('maps culture correctly', () => {
      expect(
        mapItemToCategory({ contenttypeid: '14', title: '부산시립미술관' }),
      ).toBe(PlaceCategory.CULTURE);
    });

    it('maps food correctly', () => {
      expect(
        mapItemToCategory({ contenttypeid: '39', title: '돼지국밥' }),
      ).toBe(PlaceCategory.FOOD);
    });
  });

  describe('parseTimeString', () => {
    it('parses standard HH:MM time range', () => {
      const result = parseTimeString('09:00 ~ 21:00');
      expect(result).toEqual({ openTime: '09:00', closeTime: '21:00' });
    });

    it('parses Korean time range', () => {
      const result = parseTimeString('9시 ~ 18시');
      expect(result).toEqual({ openTime: '09:00', closeTime: '18:00' });
    });

    it('standardizes 24h/always open to 00:00~23:59', () => {
      const result = parseTimeString('상시 개방');
      expect(result).toEqual({ openTime: '00:00', closeTime: '23:59' });
    });
  });

  describe('handlePlaceSync', () => {
    it('fetches items from API and upserts valid places within Busan bounds', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          response: {
            body: {
              items: {
                item: [
                  {
                    contentid: '12345',
                    title: '해운대 오션 카페',
                    addr1: '부산광역시 해운대구 우동',
                    contenttypeid: '39',
                    mapx: '129.158',
                    mapy: '35.158',
                  },
                ],
              },
            },
          },
        },
      });
      routeRepositoryMock.upsertPlaceFromKto.mockResolvedValue({});

      const result = await service.handlePlaceSync();

      expect(result.updatedCount).toBeGreaterThan(0);
      expect(result.failureCount).toBe(0);
      expect(routeRepositoryMock.upsertPlaceFromKto).toHaveBeenCalled();
    });

    it('skips places outside Busan bounds or invalid coordinates', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          response: {
            body: {
              items: {
                item: [
                  {
                    contentid: '99999',
                    title: '서울 명동',
                    addr1: '서울특별시 중구',
                    contenttypeid: '12',
                    mapx: '126.98',
                    mapy: '37.56', // 서울 좌표 (부산 외부)
                  },
                ],
              },
            },
          },
        },
      });

      const result = await service.handlePlaceSync();

      expect(result.updatedCount).toBe(0);
      expect(routeRepositoryMock.upsertPlaceFromKto).not.toHaveBeenCalled();
    });

    it('returns failureCount: 1 if VK_KORSERVICE2_API_KEY is empty', async () => {
      delete process.env.VK_KORSERVICE2_API_KEY;

      const result = await service.handlePlaceSync();

      expect(result.apiCallCount).toBe(0);
      expect(result.updatedCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(service.getStatus().lastResult).toBe('FAILURE');
      expect(service.getLastAttemptAt()).toBeDefined();
    });

    it('throws 429 HttpException when already running', async () => {
      (service as unknown as { isRunning: boolean }).isRunning = true;

      await expect(service.handlePlaceSync()).rejects.toThrow(
        '관광지 마스터 동기화 작업이 이미 실행 중입니다.',
      );
    });

    it('fetches multiple pages if totalCount exceeds page size', async () => {
      // 1페이지 (100건 중 1건), totalCount: 150
      mockedAxios.get
        .mockResolvedValueOnce({
          data: {
            response: {
              body: {
                totalCount: 150,
                items: {
                  item: [
                    {
                      contentid: 'p-1',
                      title: '해운대',
                      addr1: '부산 해운대',
                      contenttypeid: '12',
                      mapx: '129.158',
                      mapy: '35.158',
                    },
                  ],
                },
              },
            },
          },
        })
        // 2페이지 (남은 50건 중 1건)
        .mockResolvedValueOnce({
          data: {
            response: {
              body: {
                totalCount: 150,
                items: {
                  item: [
                    {
                      contentid: 'p-2',
                      title: '광안리',
                      addr1: '부산 수영구',
                      contenttypeid: '12',
                      mapx: '129.118',
                      mapy: '35.153',
                    },
                  ],
                },
              },
            },
          },
        })
        // 나머지 카테고리들 (빈 결과)
        .mockResolvedValue({
          data: {
            response: {
              body: {
                totalCount: 0,
                items: { item: [] },
              },
            },
          },
        });

      routeRepositoryMock.upsertPlaceFromKto.mockResolvedValue({});

      const result = await service.handlePlaceSync();

      expect(result.updatedCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(routeRepositoryMock.upsertPlaceFromKto).toHaveBeenCalledTimes(2);
      // openTime, closeTime are null
      expect(routeRepositoryMock.upsertPlaceFromKto).toHaveBeenCalledWith(
        'p-1',
        expect.objectContaining({
          openTime: null,
          closeTime: null,
        }),
      );
    });

    it('resets daily usage when date changes', () => {
      // Simulate usage on yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      (
        service as unknown as { dailyApiUsage: number; usageDate: string }
      ).dailyApiUsage = 500;
      (
        service as unknown as { dailyApiUsage: number; usageDate: string }
      ).usageDate = yesterdayStr;

      const status = service.getStatus();
      expect(status.dailyApiUsage).toBe(0);
    });
  });
});
