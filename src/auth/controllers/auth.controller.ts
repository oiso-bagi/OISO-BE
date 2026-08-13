import {
  Controller,
  Get,
  HttpCode,
  InternalServerErrorException,
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
  OAUTH_RETURN_URL_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import {
  ApiAuthControllerDocs,
  ApiGetCurrentUserDocs,
  ApiGetSessionDocs,
  ApiHandleGoogleCallbackDocs,
  ApiHandleKakaoCallbackDocs,
  ApiLogoutDocs,
  ApiRedirectToGoogleDocs,
  ApiRedirectToKakaoDocs,
  ApiRefreshAccessTokenDocs,
} from '@/auth/docs/auth-swagger.docs';
import { AuthSessionResponseDto } from '@/auth/dto/auth-session-response.dto';
import { AuthTokenResponseDto } from '@/auth/dto/auth-token-response.dto';
import { CurrentUserResponseDto } from '@/auth/dto/current-user-response.dto';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import { AuthService } from '@/auth/services/auth.service';
import { GoogleAuthService } from '@/auth/services/google-auth.service';
import { KakaoAuthService } from '@/auth/services/kakao-auth.service';
import { OAuthFlowService } from '@/auth/services/oauth-flow.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiAuthControllerDocs()
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly kakaoAuthService: KakaoAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly authCookieService: AuthCookieService,
    private readonly oauthFlowService: OAuthFlowService,
  ) {}

  @Get('auth/kakao/login')
  @ApiRedirectToKakaoDocs()
  redirectToKakao(
    @Query('returnUrl') returnUrl: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): void {
    const redirectUri = this.getOAuthCallbackUrl(request, 'kakao');

    this.redirectToProvider(response, returnUrl, (state) =>
      this.kakaoAuthService.getAuthorizationUrl(state, redirectUri),
    );
  }

  @Get('auth/kakao/callback')
  @ApiHandleKakaoCallbackDocs()
  async handleKakaoCallback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.oauthFlowService.handleSocialCallback({
      code,
      state,
      error,
      request,
      response,
      providerName: 'Kakao',
      getProfile: (validatedCode) =>
        this.kakaoAuthService.getUserProfile(
          validatedCode,
          this.getOAuthCallbackUrl(request, 'kakao'),
        ),
      login: (profile) => this.authService.loginWithKakao(profile),
    });
  }

  @Get('auth/google/login')
  @ApiRedirectToGoogleDocs()
  redirectToGoogle(
    @Query('returnUrl') returnUrl: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): void {
    const redirectUri = this.getOAuthCallbackUrl(request, 'google');

    this.redirectToProvider(response, returnUrl, (state) =>
      this.googleAuthService.getAuthorizationUrl(state, redirectUri),
    );
  }

  @Get('auth/google/callback')
  @ApiHandleGoogleCallbackDocs()
  async handleGoogleCallback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Query('error') error: unknown,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    await this.oauthFlowService.handleSocialCallback({
      code,
      state,
      error,
      request,
      response,
      providerName: 'Google',
      getProfile: (validatedCode) =>
        this.googleAuthService.getUserProfile(
          validatedCode,
          this.getOAuthCallbackUrl(request, 'google'),
        ),
      login: (profile) => this.authService.loginWithGoogle(profile),
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiGetCurrentUserDocs()
  getCurrentUser(@CurrentUser() user: User): CurrentUserResponseDto {
    return CurrentUserResponseDto.from(user);
  }

  @Post('auth/refresh')
  @HttpCode(200)
  @ApiRefreshAccessTokenDocs()
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
  @ApiGetSessionDocs()
  async getSession(@Req() request: Request): Promise<AuthSessionResponseDto> {
    const cookies = this.authCookieService.parseCookies(request);
    const authenticated = await this.authService.hasAuthenticatedSession(
      cookies[REFRESH_TOKEN_COOKIE],
    );

    return AuthSessionResponseDto.from(authenticated);
  }

  @Post('auth/logout')
  @HttpCode(204)
  @ApiLogoutDocs()
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
    returnUrl: unknown,
    getAuthorizationUrl: (state: string) => string,
  ): void {
    const state = randomBytes(24).toString('base64url');
    const validatedReturnUrl =
      this.authCookieService.getSafeOAuthReturnUrl(returnUrl);

    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.authCookieService.getBaseCookieOptions(),
      maxAge: 5 * 60 * 1000,
    });
    if (validatedReturnUrl) {
      response.cookie(OAUTH_RETURN_URL_COOKIE, validatedReturnUrl, {
        ...this.authCookieService.getBaseCookieOptions(),
        maxAge: 5 * 60 * 1000,
      });
    }
    response.redirect(getAuthorizationUrl(state));
  }

  private getOAuthCallbackUrl(
    request: Request,
    provider: 'kakao' | 'google',
  ): string {
    const protocol = this.getForwardedHeaderValue(
      request.headers['x-forwarded-proto'],
    );
    const host =
      this.getForwardedHeaderValue(request.headers['x-forwarded-host']) ??
      request.headers.host;

    if (!host) {
      throw new InternalServerErrorException(
        'OAuth callback host could not be resolved.',
      );
    }

    const origin = `${protocol ?? request.protocol}://${host}`;

    return `${origin}/api/v1/auth/${provider}/callback`;
  }

  private getForwardedHeaderValue(
    value: string | string[] | undefined,
  ): string | undefined {
    const header = Array.isArray(value) ? value[0] : value;

    return header?.split(',')[0]?.trim();
  }
}
