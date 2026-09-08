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
  redirectMock: jest.Mock<void, [string]>;
}

describe('AuthController', () => {
  const originalKakaoRedirectUri = process.env.KAKAO_REDIRECT_URI;
  const originalGoogleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  const mockAuthService = {
    loginWithKakao: jest.fn(),
    loginWithGoogle: jest.fn(),
  };
  const mockKakaoAuthService = {
    getAuthorizationUrl: jest.fn(),
    getUserProfile: jest.fn(),
  };
  const mockGoogleAuthService = {
    getAuthorizationUrl: jest.fn(),
    getUserProfile: jest.fn(),
  };
  const mockAuthCookieService = {
    getSafeOAuthReturnUrl: jest.fn(),
    getBaseCookieOptions: jest.fn(),
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
    mockAuthCookieService.getSafeOAuthReturnUrl.mockReturnValue(undefined);
    mockAuthCookieService.getBaseCookieOptions.mockReturnValue({
      httpOnly: true,
    });
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
      const request = {
        protocol: 'http',
        headers: {
          host: 'localhost:3000',
        },
      } as Request;

      expect(controller['getOAuthCallbackUrl'](request, 'kakao')).toBe(
        'http://localhost:3000/api/v1/auth/kakao/callback',
      );
    });

    it('builds a deployed callback URL from forwarded proxy headers', () => {
      const request = {
        protocol: 'http',
        headers: {
          host: 'internal.railway.app',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'oiso-be-production.up.railway.app',
        },
      } as unknown as Request;

      expect(controller['getOAuthCallbackUrl'](request, 'google')).toBe(
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

      expect(controller['resolveOAuthRedirectUri'](request, 'kakao')).toBe(
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

      expect(controller['resolveOAuthRedirectUri'](request, 'google')).toBe(
        'https://api.example.com/api/v1/auth/google/callback',
      );
    });

    it('redirects to Kakao with the configured redirect URI', () => {
      process.env.KAKAO_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/kakao/callback';
      const request = createRailwayRequest();
      const response = createResponse();

      controller.redirectToKakao(undefined, request, response);

      expect(mockKakaoAuthService.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.any(String),
        'https://api.example.com/api/v1/auth/kakao/callback',
      );
      expect(response.redirectMock).toHaveBeenCalledWith(
        'https://kauth.kakao.com/oauth/authorize',
      );
    });

    it('redirects to Google with the configured redirect URI', () => {
      process.env.GOOGLE_REDIRECT_URI =
        'https://api.example.com/api/v1/auth/google/callback';
      const request = createRailwayRequest();
      const response = createResponse();

      controller.redirectToGoogle(undefined, request, response);

      expect(mockGoogleAuthService.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.any(String),
        'https://api.example.com/api/v1/auth/google/callback',
      );
      expect(response.redirectMock).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/v2/auth',
      );
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

      expect(mockKakaoAuthService.getUserProfile).toHaveBeenCalledWith(
        'validated-code',
        'https://api.example.com/api/v1/auth/kakao/callback',
      );
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

      expect(mockGoogleAuthService.getUserProfile).toHaveBeenCalledWith(
        'validated-code',
        'https://api.example.com/api/v1/auth/google/callback',
      );
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

      expect(mockKakaoAuthService.getAuthorizationUrl).toHaveBeenCalledWith(
        expect.any(String),
        'https://oiso-be-production.up.railway.app/api/v1/auth/kakao/callback',
      );
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
  const redirectMock = jest.fn<void, [string]>();

  return {
    cookie: jest.fn(),
    redirect: redirectMock,
    redirectMock,
  } as unknown as MockResponse;
}

function getFirstSocialCallbackParams(
  handleSocialCallback: jest.Mock<Promise<void>, [OAuthCallbackParams]>,
): OAuthCallbackParams {
  const params = handleSocialCallback.mock.calls[0]?.[0];

  if (!params) {
    throw new Error('Expected OAuth callback params to be captured.');
  }

  return params;
}
