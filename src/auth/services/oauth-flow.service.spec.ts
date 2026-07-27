/// <reference types="jest" />

import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_RETURN_URL_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import { OAuthFlowService } from '@/auth/services/oauth-flow.service';

describe('OAuthFlowService', () => {
  let service: OAuthFlowService;
  const authCookieService = new AuthCookieService();
  const originalEnv = process.env;

  const createResponse = (): Response =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
      redirect: jest.fn(),
    }) as unknown as Response;

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
    const response = createResponse();

    await service.handleSocialCallback({
      code: 'code',
      state: 'state',
      error: undefined,
      request: createRequest('/routes/1'),
      response,
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

    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      'refresh-token',
      expect.objectContaining({ maxAge: expect.any(Number) }),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      OAUTH_RETURN_URL_COOKIE,
      expect.any(Object),
    );
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/consents?login=success',
    );
  });

  it('redirects an existing social user back to the previous screen', async () => {
    const response = createResponse();

    await service.handleSocialCallback({
      code: 'code',
      state: 'state',
      error: undefined,
      request: createRequest('/routes/1?tab=map'),
      response,
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

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/routes/1?tab=map&login=success',
    );
  });

  it('clears auth cookies and redirects with an error reason when social login is canceled', async () => {
    const response = createResponse();
    const getProfile = jest.fn();
    const login = jest.fn();

    await service.handleSocialCallback({
      code: undefined,
      state: 'state',
      error: 'access_denied',
      request: createRequest('/routes/1'),
      response,
      providerName: 'Kakao',
      getProfile,
      login,
    });

    expect(response.clearCookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE,
      expect.any(Object),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE,
      expect.any(Object),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      OAUTH_STATE_COOKIE,
      expect.any(Object),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      OAUTH_RETURN_URL_COOKIE,
      expect.any(Object),
    );
    expect(getProfile).not.toHaveBeenCalled();
    expect(login).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:5173/login?error=kakao_auth_failed&reason=kakao_canceled',
    );
  });
});
