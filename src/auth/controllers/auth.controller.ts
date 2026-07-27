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
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import { AuthSessionResponseDto } from '@/auth/dto/auth-session-response.dto';
import { AuthTokenResponseDto } from '@/auth/dto/auth-token-response.dto';
import { CurrentUserResponseDto } from '@/auth/dto/current-user-response.dto';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import { AuthService, AuthTokens } from '@/auth/services/auth.service';
import { GoogleAuthService } from '@/auth/services/google-auth.service';
import { KakaoAuthService } from '@/auth/services/kakao-auth.service';
import { SocialUserProfile } from '@/auth/types/social-auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';

interface SocialCallbackParams {
  code: unknown;
  state: unknown;
  error: unknown;
  request: Request;
  response: Response;
  providerName: string;
  getProfile: (code: string) => Promise<SocialUserProfile>;
  login: (profile: SocialUserProfile) => Promise<{ tokens: AuthTokens }>;
}

@Controller('api/v1')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly kakaoAuthService: KakaoAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Get('auth/kakao/login')
  redirectToKakao(@Res() response: Response): void {
    this.redirectToProvider(response, (state) =>
      this.kakaoAuthService.getAuthorizationUrl(state),
    );
  }

  @Get('auth/kakao/callback')
  async handleKakaoCallback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.handleSocialCallback({
      code,
      state,
      error,
      request,
      response,
      providerName: 'Kakao',
      getProfile: (validatedCode) =>
        this.kakaoAuthService.getUserProfile(validatedCode),
      login: (profile) => this.authService.loginWithKakao(profile),
    });
  }

  @Get('auth/google/login')
  redirectToGoogle(@Res() response: Response): void {
    this.redirectToProvider(response, (state) =>
      this.googleAuthService.getAuthorizationUrl(state),
    );
  }

  @Get('auth/google/callback')
  async handleGoogleCallback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.handleSocialCallback({
      code,
      state,
      error,
      request,
      response,
      providerName: 'Google',
      getProfile: (validatedCode) =>
        this.googleAuthService.getUserProfile(validatedCode),
      login: (profile) => this.authService.loginWithGoogle(profile),
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getCurrentUser(@CurrentUser() user: User): CurrentUserResponseDto {
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

  private redirectToProvider(
    response: Response,
    getAuthorizationUrl: (state: string) => string,
  ): void {
    const state = randomBytes(24).toString('base64url');

    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.authCookieService.getBaseCookieOptions(),
      maxAge: 5 * 60 * 1000,
    });
    response.redirect(getAuthorizationUrl(state));
  }

  private async handleSocialCallback(
    params: SocialCallbackParams,
  ): Promise<void> {
    const {
      code,
      state,
      error,
      request,
      response,
      providerName,
      getProfile,
      login,
    } = params;

    try {
      if (error) {
        throw new BadRequestException(`${providerName} login was canceled.`);
      }

      const validatedCode = this.getRequiredQueryString(
        code,
        `${providerName} authorization code is required.`,
      );
      const validatedState = this.getRequiredQueryString(
        state,
        `${providerName} OAuth state is required.`,
      );

      const cookies = this.authCookieService.parseCookies(request);
      const storedState = cookies[OAUTH_STATE_COOKIE];

      this.logOAuthStateValidation(
        providerName,
        validatedState,
        storedState,
        request,
      );

      this.authCookieService.validateOAuthState(validatedState, storedState);

      const profile = await getProfile(validatedCode);
      const { tokens } = await login(profile);

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
    } catch (err) {
      this.logger.error(`${providerName} OAuth callback failed.`, err);
      response.clearCookie(
        OAUTH_STATE_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.redirect(
        this.authCookieService.getFailureRedirectUrl(
          this.authCookieService.getFailureReason(err),
        ),
      );
    }
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

  private logOAuthStateValidation(
    providerName: string,
    state: string,
    storedState: string | undefined,
    request: Request,
  ): void {
    if (storedState && storedState === state) {
      return;
    }

    this.logger.warn('OAuth state validation failed.', {
      provider: providerName,
      hasQueryState: state.length > 0,
      hasCookieState: Boolean(storedState),
      stateMatchesCookie: storedState === state,
      host: request.headers.host,
      origin: request.headers.origin,
      refererHost: this.getHeaderHost(request.headers.referer),
    });
  }

  private getHeaderHost(value: string | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    try {
      return new URL(value).host;
    } catch {
      return undefined;
    }
  }

  private getRequiredQueryString(value: unknown, message: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(message);
    }

    return value.trim();
  }
}
