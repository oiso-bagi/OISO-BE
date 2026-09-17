/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { RouteRepository } from '@/route/repositories/route.repository';
import { KtoRelatedPlaceSyncService } from '@/route/services/kto-related-place-sync.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KtoRelatedPlaceSyncService', () => {
  let service: KtoRelatedPlaceSyncService;
  let repository: jest.Mocked<RouteRepository>;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KtoRelatedPlaceSyncService,
        {
          provide: RouteRepository,
          useValue: {
            findPlaceByName: jest.fn(),
            updatePlacePremiumIndex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KtoRelatedPlaceSyncService>(
      KtoRelatedPlaceSyncService,
    );
    repository = module.get(RouteRepository);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('safeDecodeApiKey', () => {
    it('빈 키가 주어지면 빈 문자열을 반환해야 한다', () => {
      expect(service.safeDecodeApiKey('')).toBe('');
    });

    it('인코딩되지 않은 키는 그대로 반환해야 한다', () => {
      expect(service.safeDecodeApiKey('plainApiKey123')).toBe('plainApiKey123');
    });

    it('URL 인코딩된 키는 디코딩되어 반환되어야 한다', () => {
      const encoded = encodeURIComponent('key+with/symbols=');
      expect(service.safeDecodeApiKey(encoded)).toBe('key+with/symbols=');
    });

    it('이중 인코딩된 키도 완전하게 디코딩되어야 한다', () => {
      const raw = 'test+key/abc=';
      const doubleEncoded = encodeURIComponent(encodeURIComponent(raw));
      expect(service.safeDecodeApiKey(doubleEncoded)).toBe(raw);
    });
  });

  describe('getStatus', () => {
    it('초기 상태를 올바르게 반환해야 한다', () => {
      const status = service.getStatus();
      expect(status.status).toBe('IDLE');
      expect(status.dailyQuotaLimit).toBe(1000);
      expect(status.dailyApiUsage).toBe(0);
      expect(status.lastCollectedAt).toBeNull();
      expect(status.matchedPlaceCount).toBe(0);
    });
  });

  describe('handleRelatedPlaceSync', () => {
    it('API 키가 없으면 동기화를 중단하고 실패 메시지를 기록해야 한다', async () => {
      delete process.env.VK_KORSERVICE2_API_KEY;

      const result = await service.handleRelatedPlaceSync();

      expect(result.collectedCount).toBe(0);
      expect(result.matchedPlaceCount).toBe(0);
      expect(result.apiCallCount).toBe(0);
      expect(service.getStatus().lastResult).toBe('FAILURE');
      expect(service.getStatus().lastMessage).toBe(
        'API 키가 설정되지 않았습니다.',
      );
    });

    it('이미 실행 중일 때 중복 실행되지 않아야 한다', async () => {
      process.env.VK_KORSERVICE2_API_KEY = 'test_key';

      // 강제로 isRunning을 true로 설정
      (service as unknown as { isRunning: boolean }).isRunning = true;

      const result = await service.handleRelatedPlaceSync();
      expect(result.collectedCount).toBe(0);
      expect(result.apiCallCount).toBe(0);
    });

    it('정상 응답 시 연관 관광지 수집 및 DB 매칭/갱신이 정상 동작해야 한다', async () => {
      process.env.VK_KORSERVICE2_API_KEY = 'test_key';

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          response: {
            body: {
              items: {
                item: [
                  {
                    tatsNm: '해운대해수욕장',
                    rlteTatsNm: '더베이101',
                    rlteRank: 1,
                  },
                  {
                    tatsNm: '광안리해수욕장',
                    rlteTatsNm: '밀락더마켓',
                    rlteRank: 5,
                  },
                  {
                    tatsNm: '자갈치시장',
                    rlteTatsNm: '존재하지않는가게',
                    rlteRank: 10,
                  },
                ],
              },
            },
          },
        },
      });

      repository.findPlaceByName.mockImplementation((name: string) => {
        if (name === '더베이101') {
          return Promise.resolve({ id: 'place-1', name: '더베이101' } as any);
        }
        if (name === '밀락더마켓') {
          return Promise.resolve({ id: 'place-2', name: '밀락더마켓' } as any);
        }
        return Promise.resolve(null);
      });

      repository.updatePlacePremiumIndex.mockResolvedValue({} as never);

      const result = await service.handleRelatedPlaceSync();

      expect(result.collectedCount).toBe(3);
      expect(result.matchedPlaceCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.apiCallCount).toBe(1);

      expect(repository.findPlaceByName).toHaveBeenCalledWith('더베이101');
      expect(repository.findPlaceByName).toHaveBeenCalledWith('밀락더마켓');
      expect(repository.findPlaceByName).toHaveBeenCalledWith(
        '존재하지않는가게',
      );

      expect(repository.updatePlacePremiumIndex).toHaveBeenCalledWith(
        'place-1',
        99,
      );
      expect(repository.updatePlacePremiumIndex).toHaveBeenCalledWith(
        'place-2',
        95,
      );

      const status = service.getStatus();
      expect(status.lastResult).toBe('SUCCESS');
      expect(status.lastCollectedAt).toBeInstanceOf(Date);
      expect(status.matchedPlaceCount).toBe(2);
      expect(status.dailyApiUsage).toBe(1);
    });

    it('API 호출 실패 시 FAILURE 상태로 기록하고 에러를 포착해야 한다', async () => {
      process.env.VK_KORSERVICE2_API_KEY = 'test_key';
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Timeout'));

      const result = await service.handleRelatedPlaceSync();

      expect(result.collectedCount).toBe(0);
      expect(result.failureCount).toBe(1);
      const status = service.getStatus();
      expect(status.lastResult).toBe('FAILURE');
      expect(status.lastMessage).toContain('Network Timeout');
    });
  });
});
