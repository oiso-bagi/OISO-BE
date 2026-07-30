import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_RETURN_URL_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/auth/auth.constants';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import type { SocialLoginResult } from '@/auth/types/auth-result.types';
import type { SocialUserProfile } from '@/auth/types/social-auth.types';

interface SocialCallbackParams {
  code: unknown;
  state: unknown;
  error: unknown;
  request: Request;
  response: Response;
  providerName: string;
  getProfile: (code: string) => Promise<SocialUserProfile>;
  login: (profile: SocialUserProfile) => Promise<SocialLoginResult>;
}

@Injectable()
export class OAuthFlowService {
  private readonly logger = new Logger(OAuthFlowService.name);

  constructor(private readonly authCookieService: AuthCookieService) {}

  async handleSocialCallback(params: SocialCallbackParams): Promise<void> {
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
      const { tokens, isNewUser } = await login(profile);
      const returnUrl = this.authCookieService.getSafeOAuthReturnUrl(
        cookies[OAUTH_RETURN_URL_COOKIE],
      );

      this.setRefreshTokenCookie(response, tokens.refreshToken);
      response.clearCookie(
        ACCESS_TOKEN_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.clearCookie(
        OAUTH_STATE_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.clearCookie(
        OAUTH_RETURN_URL_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.redirect(
        isNewUser
          ? this.authCookieService.getConsentRedirectUrl()
          : this.authCookieService.getSuccessRedirectUrl(returnUrl),
      );
    } catch (err) {
      this.logger.error(`${providerName} OAuth callback failed.`, err);
      response.clearCookie(
        ACCESS_TOKEN_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.clearCookie(
        REFRESH_TOKEN_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.clearCookie(
        OAUTH_STATE_COOKIE,
        this.authCookieService.getBaseCookieOptions(),
      );
      response.clearCookie(
        OAUTH_RETURN_URL_COOKIE,
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
