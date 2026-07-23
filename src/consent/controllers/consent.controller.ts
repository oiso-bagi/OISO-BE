import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { User } from '@prisma/client';
import { ACCESS_TOKEN_COOKIE } from '../../auth/auth.constants';
import { AuthCookieService } from '../../auth/services/auth-cookie.service';
import { AuthService } from '../../auth/services/auth.service';
import { ConsentService } from '../services/consent.service';
import { ConsentStatusResponseDto } from '../dto/consent-status-response.dto';
import { SubmitConsentRequestDto } from '../dto/submit-consent-request.dto';

@Controller('api/v1/consents')
export class ConsentController {
  constructor(
    private readonly consentService: ConsentService,
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Get()
  async getStatus(@Req() request: Request): Promise<ConsentStatusResponseDto> {
    const user = await this.getAuthenticatedUser(request);

    return this.consentService.getConsentStatus(user.id);
  }

  @Post()
  @HttpCode(200)
  async submit(
    @Req() request: Request,
    @Body() body: SubmitConsentRequestDto,
  ): Promise<ConsentStatusResponseDto> {
    const user = await this.getAuthenticatedUser(request);

    return this.consentService.submitConsents(user.id, body);
  }

  private async getAuthenticatedUser(request: Request): Promise<User> {
    const cookies = this.authCookieService.parseCookies(request);

    return this.authService.getCurrentUser(
      this.authCookieService.getBearerToken(request) ??
        cookies[ACCESS_TOKEN_COOKIE],
    );
  }
}
