import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { ACCESS_TOKEN_COOKIE } from '@/auth/auth.constants';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import { AuthService } from '@/auth/services/auth.service';

export type AuthenticatedRequest = Request & { user: User };

/**
 * 액세스 토큰(쿠키 또는 Bearer 헤더)을 검증해 요청에 현재 로그인한 유저를 붙여줍니다.
 * 토큰이 없거나 유효하지 않으면 AuthService.getCurrentUser가 UnauthorizedException을 던집니다.
 * 인증된 유저는 @CurrentUser() 데코레이터로 꺼내 쓰면 됩니다.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = this.authCookieService.parseCookies(request);

    request.user = await this.authService.getCurrentUser(
      this.authCookieService.getBearerToken(request) ??
        cookies[ACCESS_TOKEN_COOKIE],
    );

    return true;
  }
}
