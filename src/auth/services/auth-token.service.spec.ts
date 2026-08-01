/// <reference types="jest" />

import {
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from '@/auth/services/auth-token.service';

describe('AuthTokenService', () => {
  let service: AuthTokenService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '14d',
    };
    service = new AuthTokenService(new JwtService());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  it('issues and verifies access tokens', () => {
    const token = service.issueAccessToken('user-id', 'kakao');

    expect(service.verifyAccessToken(token)).toEqual(
      expect.objectContaining({
        sub: 'user-id',
        provider: 'kakao',
        type: 'access',
      }),
    );
  });

  it('rejects refresh tokens when verifying an access token', () => {
    const token = service.issueRefreshToken('user-id', 'kakao');

    expect(() => service.verifyAccessToken(token)).toThrow(
      UnauthorizedException,
    );
  });

  it('issues and verifies refresh tokens', () => {
    const token = service.issueRefreshToken('user-id', 'kakao');

    expect(service.verifyRefreshToken(token)).toEqual(
      expect.objectContaining({
        sub: 'user-id',
        provider: 'kakao',
        type: 'refresh',
      }),
    );
  });

  it('rejects access tokens when verifying a refresh token', () => {
    const token = service.issueAccessToken('user-id', 'kakao');

    expect(() => service.verifyRefreshToken(token)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired access tokens', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.JWT_ACCESS_EXPIRES_IN = '1s';
    const token = service.issueAccessToken('user-id', 'kakao');

    jest.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));

    expect(() => service.verifyAccessToken(token)).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects expired refresh tokens', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    process.env.JWT_REFRESH_EXPIRES_IN = '1s';
    const token = service.issueRefreshToken('user-id', 'kakao');

    jest.setSystemTime(new Date('2026-01-01T00:00:02.000Z'));

    expect(() => service.verifyRefreshToken(token)).toThrow(
      UnauthorizedException,
    );
  });

  it('requires access token secret config', () => {
    delete process.env.JWT_ACCESS_SECRET;
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation();
    let thrownError: unknown;

    try {
      service.issueAccessToken('user-id', 'kakao');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(InternalServerErrorException);
    expect((thrownError as Error).message).toBe(
      '서버 설정 오류가 발생했습니다.',
    );
    expect((thrownError as Error).message).not.toContain('JWT_ACCESS_SECRET');
    expect(loggerSpy).toHaveBeenCalledWith(
      'Required environment variable is missing: JWT_ACCESS_SECRET',
    );
  });
});
