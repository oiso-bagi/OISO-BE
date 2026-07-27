/// <reference types="jest" />

import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_RETURN_URL_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import type { SocialLoginResult } from '@/auth/services/auth.service';
import { OAuthFlowService } from '@/auth/services/oauth-flow.service';
import type { SocialUserProfile } from '@/auth/types/social-auth.types';

interface MockResponse {
  response: Response;
  cookie: jest.Mock<Response, [string, string, object]>;
  clearCookie: jest.Mock<Response, [string, object?]>;
  redirect: jest.Mock<Response, [string]>;
}

describe('OAuthFlowService', () => {
  let service: OAuthFlowService;
  const authCookieService = new AuthCookieService();
  const originalEnv = process.env;

  const createResponse = (): MockResponse => {
    const cookie = jest.fn<Response, [string, string, object]>();
    const clearCookie = jest.fn<Response, [string, object?]>();
    const redirect = jest.fn<Response, [string]>();

    return {
      response: {
        cookie,
        clearCookie,
        redirect,
      } as unknown as Response,
      cookie,
      clearCookie,
      redirect,
    };
  };

  const createRequest = (returnUrl?: string): Request =>
    ({
      headers: {
        cookie: [
          `${OAUTH_STATE_COOKIE}=state`,
          returnUrl
            ? `${OAUTH_RETURN_URL_COOKIE}=${encodeURIComponent(returnUrl)}`
            : undefined,
        ]
          .filter(Boolean)
          .join('; '),
        host: 'localhost:3000',
      },
    }) as unknown as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      FRONTEND_AUTH_CONSENT_REDIRECT: 'http://localhost:5173/consents',
      FRONTEND_AUTH_SUCCESS_REDIRECT: 'http://localhost:5173/auth/success',
    };
    service = new OAuthFlowService(authCookieService);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('redirects a new social user to the consent screen', async () => {
    const mockResponse = createResponse();

    await service.handleSocialCallback({
      code: 'code',
      state: 'state',
      error: undefined,
      request: createRequest('/routes/1'),
      response: mockResponse.response,
      providerName: 'Kakao',
      getProfile: jest.fn().mockResolvedValue({
        providerId: 'provider-id',
        email: 'user@example.com',
        nickname: 'user',
      }),
      login: jest.fn().mockResolvedValue({
        user: { id: 'user-id', provider: 'kakao' },
        tokens: { refreshToken: 'refresh-token' },
        isNewUser: true,
      }),
    });

    const refreshTokenCookieCall = mockResponse.cookie.mock.calls[0];
    const refreshTokenCookieOptions = refreshTokenCookieCall[2] as {
      maxAge?: unknown;
    };

    expect(refreshTokenCookieCall[0]).toBe(REFRESH_TOKEN_COOKIE);
    expect(refreshTokenCookieCall[1]).toBe('refresh-token');
    expect(typeof refreshTokenCookieOptions.maxAge).toBe('number');
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      OAUTH_RETURN_URL_COOKIE,
      expect.any(Object),
    );
    expect(mockResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/consents?login=success',
    );
  });

  it('redirects an existing social user back to the previous screen', async () => {
    const mockResponse = createResponse();

    await service.handleSocialCallback({
      code: 'code',
      state: 'state',
      error: undefined,
      request: createRequest('/routes/1?tab=map'),
      response: mockResponse.response,
      providerName: 'Google',
      getProfile: jest.fn().mockResolvedValue({
        providerId: 'provider-id',
        email: 'user@example.com',
        nickname: 'user',
      }),
      login: jest.fn().mockResolvedValue({
        user: { id: 'user-id', provider: 'google' },
        tokens: { refreshToken: 'refresh-token' },
        isNewUser: false,
      }),
    });

    expect(mockResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/routes/1?tab=map&login=success',
    );
  });

  it('clears auth cookies and redirects with an error reason when social login is canceled', async () => {
    const mockResponse = createResponse();
    const getProfile = jest.fn<Promise<SocialUserProfile>, [string]>();
    const login = jest.fn<Promise<SocialLoginResult>, [SocialUserProfile]>();

    await service.handleSocialCallback({
      code: undefined,
      state: 'state',
      error: 'access_denied',
      request: createRequest('/routes/1'),
      response: mockResponse.response,
      providerName: 'Kakao',
      getProfile,
      login,
    });

    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.any(Object),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      expect.any(Object),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      expect.any(Object),
    );
    expect(mockResponse.clearCookie).toHaveBeenCalledWith(
      OAUTH_RETURN_URL_COOKIE,
      expect.any(Object),
    );
    expect(getProfile).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
    expect(mockResponse.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=kakao_auth_failed&reason=kakao_canceled',
    );
  });
});
