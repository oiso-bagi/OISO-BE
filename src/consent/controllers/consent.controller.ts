import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { ConsentService } from '@/consent/services/consent.service';
import { ConsentStatusResponseDto } from '@/consent/dto/consent-status-response.dto';
import { SubmitConsentRequestDto } from '@/consent/dto/submit-consent-request.dto';

@Controller('api/v1/consents')
@UseGuards(AuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get()
  getStatus(@CurrentUser() user: User): Promise<ConsentStatusResponseDto> {
    return this.consentService.getConsentStatus(user.id);
  }

  @Post()
  @HttpCode(200)
  submit(
    @CurrentUser() user: User,
    @Body() body: SubmitConsentRequestDto,
  ): Promise<ConsentStatusResponseDto> {
    return this.consentService.submitConsents(user.id, body);
  }
}
