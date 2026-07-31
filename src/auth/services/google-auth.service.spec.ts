/// <reference types="jest" />

import { BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import { GoogleAuthService } from '@/auth/services/google-auth.service';

describe('GoogleAuthService', () => {
  let service: GoogleAuthService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new GoogleAuthService();
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost/auth/google/callback';
    process.env.GOOGLE_REQUEST_TIMEOUT_MS = '5000';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_REDIRECT_URI;
    delete process.env.GOOGLE_REQUEST_TIMEOUT_MS;
  });

  it('returns a profile for valid token and user responses', async () => {
    mockFetchJson({
      access_token: 'access-token',
    });
    mockFetchJson({
      sub: 'google-user-id',
      email: ' user@example.com ',
      email_verified: true,
      name: ' User ',
    });

    await expect(service.getUserProfile('code')).resolves.toEqual({
      providerId: 'google-user-id',
      email: 'user@example.com',
      nickname: 'User',
    });
  });

  it('rejects token responses without a non-empty access token', async () => {
    mockFetchJson({
      access_token: '   ',
    });

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 인증 코드를 토큰으로 교환하지 못했습니다.'),
    );
  });

  it('wraps rejected token response parsing as a token exchange failure', async () => {
    mockFetchJsonFailure();

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 인증 코드를 토큰으로 교환하지 못했습니다.'),
    );
  });

  it('rejects profile responses without a non-empty subject', async () => {
    mockFetchJson({
      access_token: 'access-token',
    });
    mockFetchJson({
      sub: '',
      email: 'user@example.com',
      email_verified: true,
      name: 'User',
    });

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 사용자 프로필 조회에 실패했습니다.'),
    );
  });

  it.each([
    ['email', { email: 123 }],
    ['name', { name: 123 }],
    ['email_verified', { email_verified: 'true' }],
  ])('rejects profile responses with malformed %s', async (_, overrides) => {
    mockFetchJson({
      access_token: 'access-token',
    });
    mockFetchJson({
      sub: 'google-user-id',
      email: 'user@example.com',
      email_verified: true,
      name: 'User',
      ...overrides,
    });

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 사용자 프로필 조회에 실패했습니다.'),
    );
  });

  it('rejects unverified Google emails before returning a profile', async () => {
    mockFetchJson({
      access_token: 'access-token',
    });
    mockFetchJson({
      sub: 'google-user-id',
      email: 'user@example.com',
      email_verified: false,
      name: 'User',
    });

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 계정 이메일 인증이 필요합니다.'),
    );
  });

  it('rejects Google profiles without a nickname', async () => {
    mockFetchJson({
      access_token: 'access-token',
    });
    mockFetchJson({
      sub: 'google-user-id',
      email: 'user@example.com',
      email_verified: true,
    });

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 계정 닉네임이 필요합니다.'),
    );
  });

  it('classifies token fetch failures as token exchange failures', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 인증 코드를 토큰으로 교환하지 못했습니다.'),
    );
  });

  it('classifies profile fetch failures as profile fetch failures', async () => {
    mockFetchJson({
      access_token: 'access-token',
    });
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 사용자 프로필 조회에 실패했습니다.'),
    );
  });

  it('wraps rejected profile response parsing as a profile fetch failure', async () => {
    mockFetchJson({
      access_token: 'access-token',
    });
    mockFetchJsonFailure();

    await expect(service.getUserProfile('code')).rejects.toThrow(
      new BadRequestException('구글 사용자 프로필 조회에 실패했습니다.'),
    );
  });

  it('preserves timeout failures as gateway timeouts', async () => {
    const timeout = new Error('timeout');
    timeout.name = 'TimeoutError';
    (global.fetch as jest.Mock).mockRejectedValueOnce(timeout);

    await expect(service.getUserProfile('code')).rejects.toThrow(
      GatewayTimeoutException,
    );
  });

  function mockFetchJson(body: unknown): void {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(body),
    });
  }

  function mockFetchJsonFailure(): void {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    });
  }
});
