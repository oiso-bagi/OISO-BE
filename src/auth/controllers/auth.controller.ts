import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import { AuthSessionResponseDto } from '@/auth/dto/auth-session-response.dto';
import { AuthTokenResponseDto } from '@/auth/dto/auth-token-response.dto';
import { CurrentUserResponseDto } from '@/auth/dto/current-user-response.dto';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import { AuthService } from '@/auth/services/auth.service';
import { KakaoAuthService } from '@/auth/services/kakao-auth.service';

@Controller('api/v1')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly kakaoAuthService: KakaoAuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Get('auth/kakao/login')
  redirectToKakao(@Res() response: Response): void {
    const state = randomBytes(24).toString('base64url');

    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.authCookieService.getBaseCookieOptions(),
      maxAge: 5 * 60 * 1000,
    });
    response.redirect(this.kakaoAuthService.getAuthorizationUrl(state));
  }

  @Get('auth/kakao/callback')
  async handleKakaoCallback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    try {
      if (error) {
        throw new BadRequestException('Kakao login was canceled.');
      }

      const validatedCode = this.getRequiredQueryString(
        code,
        'Kakao authorization code is required.',
      );
      const validatedState = this.getRequiredQueryString(
        state,
        'Kakao OAuth state is required.',
      );

      const cookies = this.authCookieService.parseCookies(request);

      this.authCookieService.validateOAuthState(
        validatedState,
        cookies[OAUTH_STATE_COOKIE],
      );

      const kakaoProfile =
        await this.kakaoAuthService.getUserProfile(validatedCode);
      const { tokens } = await this.authService.loginWithKakao(kakaoProfile);

      this.setRefreshTokenCookie(response, tokens.refreshToken);
      response.clearCookie(
        ACCESS_TOKEN_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.clearCookie(
        OAUTH_STATE_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.redirect(this.authCookieService.getSuccessRedirectUrl());
    } catch (error) {
      this.logger.error('Kakao OAuth callback failed.', error);
      response.clearCookie(
        OAUTH_STATE_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.redirect(
        this.authCookieService.getFailureRedirectUrl(
          this.authCookieService.getFailureReason(error),
        ),
      );
    }
  }

  @Get('me')
  async getCurrentUser(
    @Req() request: Request,
  ): Promise<CurrentUserResponseDto> {
    const cookies = this.authCookieService.parseCookies(request);
    const user = await this.authService.getCurrentUser(
      this.authCookieService.getBearerToken(request) ??
        cookies[ACCESS_TOKEN_COOKIE],
    );

    return CurrentUserResponseDto.from(user);
  }

  @Post('auth/refresh')
  @HttpCode(200)
  async refreshAccessToken(
    @Req() request: Request,
  ): Promise<AuthTokenResponseDto> {
    const cookies = this.authCookieService.parseCookies(request);
    const accessToken = await this.authService.refreshAccessToken(
      cookies[REFRESH_TOKEN_COOKIE],
    );

    return AuthTokenResponseDto.from(accessToken);
  }

  @Get('auth/session')
  async getSession(@Req() request: Request): Promise<AuthSessionResponseDto> {
    const cookies = this.authCookieService.parseCookies(request);
    const authenticated = await this.authService.hasAuthenticatedSession(
      cookies[REFRESH_TOKEN_COOKIE],
    );

    return AuthSessionResponseDto.from(authenticated);
  }

  @Post('auth/logout')
  @HttpCode(204)
  logout(@Res() response: Response): void {
    response.clearCookie(
      ACCESS_TOKEN_COOKIE,
      this.authCookieService.getBaseCookieOptions(),
    );
    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      this.authCookieService.getBaseCookieOptions(),
    );
    response.send();
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
  ): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...this.authCookieService.getBaseCookieOptions(),
      maxAge: this.authCookieService.getDurationMilliseconds(
        process.env.JWT_REFRESH_EXPIRES_IN ?? '14d',
      ),
    });
  }

  private getRequiredQueryString(value: unknown, message: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(message);
    }

    return value.trim();
  }
}
