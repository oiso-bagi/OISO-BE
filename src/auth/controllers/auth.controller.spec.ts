/// <reference types="jest" />

import { InternalServerErrorException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from '@/auth/controllers/auth.controller';
import type { AuthCookieService } from '@/auth/services/auth-cookie.service';
import type { AuthService } from '@/auth/services/auth.service';
import type { GoogleAuthService } from '@/auth/services/google-auth.service';
import type { KakaoAuthService } from '@/auth/services/kakao-auth.service';
import type { OAuthFlowService } from '@/auth/services/oauth-flow.service';

interface OAuthCallbackParams {
  code: unknown;
  state: unknown;
  error: unknown;
  request: Request;
  response: Response;
  providerName: string;
  getProfile: (code: string) => Promise<unknown>;
  login: (profile: unknown) => Promise<unknown>;
}

interface MockResponse extends Response {
  cookieMock: jest.Mock;
  clearCookieMock: jest.Mock;
  redirectMock: jest.Mock<void, [string]>;
  sendMock: jest.Mock;
}

type AuthorizationUrlMock = jest.Mock<string, [string, string]>;
type UserProfileMock = jest.Mock<Promise<unknown>, [string, string]>;

describe('AuthController', () => {
  const originalKakaoRedirectUri = process.env.KAKAO_REDIRECT_URI;
  const originalGoogleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  const mockAuthService = {
    loginWithKakao: jest.fn<Promise<unknown>, [unknown]>(),
    loginWithGoogle: jest.fn<Promise<unknown>, [unknown]>(),
    loginWithEmail: jest.fn<
      Promise<{ tokens: { accessToken: string; refreshToken: string } }>,
      [{ email: string; password: string }]
    >(),
    withdraw: jest.fn<Promise<void>, [string]>(),
  };
  const mockKakaoAuthService: {
    getAuthorizationUrl: AuthorizationUrlMock;
    getUserProfile: UserProfileMock;
  } = {
    getAuthorizationUrl: jest.fn<string, [string, string]>(),
    getUserProfile: jest.fn<Promise<unknown>, [string, string]>(),
  };
  const mockGoogleAuthService: {
    getAuthorizationUrl: AuthorizationUrlMock;
    getUserProfile: UserProfileMock;
  } = {
    getAuthorizationUrl: jest.fn<string, [string, string]>(),
    getUserProfile: jest.fn<Promise<unknown>, [string, string]>(),
  };
  const mockAuthCookieService = {
    getSafeOAuthReturnUrl: jest.fn<string | undefined, [unknown]>(),
    getBaseCookieOptions: jest.fn<Record<string, unknown>, []>(),
    getDurationMilliseconds: jest.fn<number, [string]>(),
  };
  const mockOAuthFlowService: {
    handleSocialCallback: jest.Mock<Promise<void>, [OAuthCallbackParams]>;
  } = {
    handleSocialCallback: jest.fn<Promise<void>, [OAuthCallbackParams]>(),
  };
  let controller: AuthController;

  afterEach(() => {
    restoreEnv('KAKAO_REDIRECT_URI', originalKakaoRedirectUri);
    restoreEnv('GOOGLE_REDIRECT_URI', originalGoogleRedirectUri);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockKakaoAuthService.getAuthorizationUrl.mockReturnValue(
      'https://kauth.kakao.com/oauth/authorize',
    );
    mockGoogleAuthService.getAuthorizationUrl.mockReturnValue(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    mockKakaoAuthService.getUserProfile.mockResolvedValue({});
    mockGoogleAuthService.getUserProfile.mockResolvedValue({});
    mockAuthCookieService.getSafeOAuthReturnUrl.mockReturnValue(undefined);
    mockAuthCookieService.getBaseCookieOptions.mockReturnValue({
      httpOnly: true,
    });
    mockAuthCookieService.getDurationMilliseconds.mockReturnValue(1209600000);
    mockAuthService.loginWithEmail.mockResolvedValue({
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    mockAuthService.withdraw.mockResolvedValue(undefined);
    mockOAuthFlowService.handleSocialCallback.mockResolvedValue(undefined);
    controller = new AuthController(
      mockAuthService as unknown as AuthService,
      mockKakaoAuthService as unknown as KakaoAuthService,
      mockGoogleAuthService as unknown as GoogleAuthService,
      mockAuthCookieService as unknown as AuthCookieService,
      mockOAuthFlowService as unknown as OAuthFlowService,
    );
  });

  describe('OAuth callback URL', () => {
    it('builds a local callback URL from the request host', () => {
      delete process.env.KAKAO_REDIRECT_URI;
      const request = {
        protocol: 'http',
        headers: {
          host: 'localhost:3000',
        },
      } as Request;
      const response = createResponse();

      controller.redirectToKakao(undefined, request, response);

      expectAuthorizationRedirectUri(
        mockKakaoAuthService.getAuthorizationUrl,
        'http://localhost:3000/api/v1/auth/kakao/callback',
      );
    });

    it('builds a deployed callback URL from forwarded proxy headers', () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      const request = {
        protocol: 'http',
        headers: {
          host: 'internal.railway.app',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'oiso-be-production.up.railway.app',
        },
      } as unknown as Request;
      const response = createResponse();

      controller.redirectToGoogle(undefined, request, response);

      expectAuthorizationRedirectUri(
        mockGoogleAuthService.getAuthorizationUrl,
        'https://oiso-be-production.up.railway.app/api/v1/auth/google/callback',
      );
    });

    it('prefers the configured Kakao redirect URI over proxy headers', () => {
      process.env.KAKAO_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/kakao/callback';
      const request = {
        protocol: 'http',
        headers: {
          host: 'internal.railway.app',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'oiso-be-production.up.railway.app',
        },
      } as unknown as Request;
      const response = createResponse();

      controller.redirectToKakao(undefined, request, response);

      expectAuthorizationRedirectUri(
        mockKakaoAuthService.getAuthorizationUrl,
        'https://api.example.com/api/v1/auth/kakao/callback',
      );
    });

    it('prefers the configured Google redirect URI over proxy headers', () => {
      process.env.GOOGLE_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/google/callback';
      const request = {
        protocol: 'http',
        headers: {
          host: 'internal.railway.app',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'oiso-be-production.up.railway.app',
        },
      } as unknown as Request;
      const response = createResponse();

      controller.redirectToGoogle(undefined, request, response);

      expectAuthorizationRedirectUri(
        mockGoogleAuthService.getAuthorizationUrl,
        'https://api.example.com/api/v1/auth/google/callback',
      );
    });

    it('redirects to Kakao with the configured redirect URI', () => {
      process.env.KAKAO_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/kakao/callback';
      const request = createRailwayRequest();
      const response = createResponse();

      controller.redirectToKakao(undefined, request, response);

      expectAuthorizationRedirectUri(
        mockKakaoAuthService.getAuthorizationUrl,
        'https://api.example.com/api/v1/auth/kakao/callback',
      );
      expect(getFirstMockCall(response.redirectMock)).toEqual([
        'https://kauth.kakao.com/oauth/authorize',
      ]);
    });

    it('redirects to Google with the configured redirect URI', () => {
      process.env.GOOGLE_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/google/callback';
      const request = createRailwayRequest();
      const response = createResponse();

      controller.redirectToGoogle(undefined, request, response);

      expectAuthorizationRedirectUri(
        mockGoogleAuthService.getAuthorizationUrl,
        'https://api.example.com/api/v1/auth/google/callback',
      );
      expect(getFirstMockCall(response.redirectMock)).toEqual([
        'https://accounts.google.com/o/oauth2/v2/auth',
      ]);
    });

    it('passes the configured Kakao redirect URI to the callback profile lookup', async () => {
      process.env.KAKAO_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/kakao/callback';
      const request = createRailwayRequest();
      const response = createResponse();

      await controller.handleKakaoCallback(
        'code',
        'state',
        undefined,
        request,
        response,
      );

      const callbackParams = getFirstSocialCallbackParams(
        mockOAuthFlowService.handleSocialCallback,
      );

      await callbackParams.getProfile('validated-code');

      expect(getFirstMockCall(mockKakaoAuthService.getUserProfile)).toEqual([
        'validated-code',
        'https://api.example.com/api/v1/auth/kakao/callback',
      ]);
    });

    it('passes the configured Google redirect URI to the callback profile lookup', async () => {
      process.env.GOOGLE_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/google/callback';
      const request = createRailwayRequest();
      const response = createResponse();

      await controller.handleGoogleCallback(
        'code',
        'state',
        undefined,
        request,
        response,
      );

      const callbackParams = getFirstSocialCallbackParams(
        mockOAuthFlowService.handleSocialCallback,
      );

      await callbackParams.getProfile('validated-code');

      expect(getFirstMockCall(mockGoogleAuthService.getUserProfile)).toEqual([
        'validated-code',
        'https://api.example.com/api/v1/auth/google/callback',
      ]);
    });

    it('rejects an invalid configured Kakao redirect URI', () => {
      process.env.KAKAO_REDIRECT_URI = 'not-a-url';

      expect(() =>
        controller.redirectToKakao(
          undefined,
          createRailwayRequest(),
          createResponse(),
        ),
      ).toThrow(InternalServerErrorException);
    });

    it('falls back to request proxy headers when redirect URI env is absent', () => {
      delete process.env.KAKAO_REDIRECT_URI;
      const request = createRailwayRequest();
      const response = createResponse();

      controller.redirectToKakao(undefined, request, response);

      expectAuthorizationRedirectUri(
        mockKakaoAuthService.getAuthorizationUrl,
        'https://oiso-be-production.up.railway.app/api/v1/auth/kakao/callback',
      );
    });
  });

  describe('loginWithEmail', () => {
    it('returns an access token and sets the refresh token cookie', async () => {
      const response = createResponse();

      await expect(
        controller.loginWithEmail(
          {
            email: 'local-admin@example.com',
            password: 'correct-password',
          },
          response,
        ),
      ).resolves.toEqual({
        accessToken: 'access-token',
        tokenType: 'Bearer',
      });

      expect(mockAuthService.loginWithEmail).toHaveBeenCalledWith({
        email: 'local-admin@example.com',
        password: 'correct-password',
      });
      expect(response.cookieMock).toHaveBeenCalledWith(
        'oiso_refresh_token',
        'refresh-token',
        {
          httpOnly: true,
          maxAge: 1209600000,
        },
      );
    });
  });

  describe('withdraw', () => {
    it('deactivates the current user and clears auth cookies', async () => {
      const response = createResponse();

      await controller.withdraw({ id: 'user-id' } as User, response);

      expect(mockAuthService.withdraw).toHaveBeenCalledWith('user-id');
      expect(response.clearCookieMock).toHaveBeenCalledWith(
        'oiso_access_token',
        {
          httpOnly: true,
        },
      );
      expect(response.clearCookieMock).toHaveBeenCalledWith(
        'oiso_refresh_token',
        {
          httpOnly: true,
        },
      );
      expect(response.sendMock).toHaveBeenCalledWith();
    });
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

function createRailwayRequest(): Request {
  return {
    protocol: 'http',
    headers: {
      host: 'internal.railway.app',
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'oiso-be-production.up.railway.app',
    },
  } as unknown as Request;
}

function createResponse(): MockResponse {
  const cookieMock = jest.fn();
  const clearCookieMock = jest.fn();
  const redirectMock = jest.fn<void, [string]>();
  const sendMock = jest.fn();

  return {
    cookie: cookieMock,
    cookieMock,
    clearCookie: clearCookieMock,
    clearCookieMock,
    redirect: redirectMock,
    redirectMock,
    send: sendMock,
    sendMock,
  } as unknown as MockResponse;
}

function getFirstSocialCallbackParams(
  handleSocialCallback: jest.Mock<Promise<void>, [OAuthCallbackParams]>,
): OAuthCallbackParams {
  const [params] = getFirstMockCall(handleSocialCallback);

  if (!params) {
    throw new Error('Expected OAuth callback params to be captured.');
  }

  return params;
}

function expectAuthorizationRedirectUri(
  getAuthorizationUrl: AuthorizationUrlMock,
  expectedRedirectUri: string,
): void {
  const [state, redirectUri] = getFirstMockCall(getAuthorizationUrl);

  expect(typeof state).toBe('string');
  expect(redirectUri).toBe(expectedRedirectUri);
}

function getFirstMockCall<TResult, TArgs extends unknown[]>(
  mock: jest.Mock<TResult, TArgs>,
): TArgs {
  const firstCall = mock.mock.calls.at(0);

  if (!firstCall) {
    throw new Error('Expected mock to have been called.');
  }

  return firstCall;
}
