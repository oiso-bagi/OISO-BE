/// <reference types="jest" />

import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import { AuthService } from '@/auth/services/auth.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const mockAuthService = {
    getCurrentUser: jest.fn(),
  };
  const mockAuthCookieService = {
    getBearerToken: jest.fn(),
  };
  let guard: AuthGuard;

  const createContext = (
    request: Partial<Request> & { user?: unknown },
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthGuard(
      mockAuthService as unknown as AuthService,
      mockAuthCookieService as unknown as AuthCookieService,
    );
  });

  it('resolves the user from the bearer token and attaches it to the request', async () => {
    const request: Partial<Request> & { user?: unknown } = { headers: {} };
    mockAuthCookieService.getBearerToken.mockReturnValue('bearer-token');
    mockAuthService.getCurrentUser.mockResolvedValue({ id: 'user-id' });

    const context = createContext(request);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith('bearer-token');
    expect(request.user).toEqual({ id: 'user-id' });
  });

  it('does not use the access token cookie as a fallback', async () => {
    const request: Partial<Request> & { user?: unknown } = {
      headers: {
        cookie: `${ACCESS_TOKEN_COOKIE}=cookie-access-token`,
      },
    };
    mockAuthCookieService.getBearerToken.mockReturnValue(undefined);
    mockAuthService.getCurrentUser.mockRejectedValue(
      new UnauthorizedException('?≪꽭???좏겙???꾩슂?⑸땲??'),
    );

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );

    expect(mockAuthService.getCurrentUser).toHaveBeenCalledWith(undefined);
  });

  it('propagates UnauthorizedException when authentication fails', async () => {
    const request: Partial<Request> & { user?: unknown } = { headers: {} };
    mockAuthCookieService.getBearerToken.mockReturnValue(undefined);
    mockAuthService.getCurrentUser.mockRejectedValue(
      new UnauthorizedException('액세스 토큰이 필요합니다.'),
    );

    await expect(guard.canActivate(createContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
