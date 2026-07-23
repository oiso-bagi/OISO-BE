import { BadRequestException, Injectable } from '@nestjs/common';
import { ConsentScope, ConsentType } from '@prisma/client';
import { ConsentRepository } from '../repositories/consent.repository';
import { ConsentStatusResponseDto } from '../dto/consent-status-response.dto';
import { SubmitConsentRequestDto } from '../dto/submit-consent-request.dto';
import { ConsentRecordInput } from '../types/consent-record.type';

const CONSENT_SCOPE_BY_TYPE: Record<ConsentType, ConsentScope> = {
  TERMS: 'REQUIRED',
  PRIVACY: 'REQUIRED',
  AGE: 'REQUIRED',
  MARKETING: 'OPTIONAL',
  LOCATION: 'OPTIONAL',
};

@Injectable()
export class ConsentService {
  constructor(private readonly consentRepository: ConsentRepository) {}

  async getConsentStatus(userId: string): Promise<ConsentStatusResponseDto> {
    const consents = await this.consentRepository.findAllByUserId(userId);

    return ConsentStatusResponseDto.from(consents);
  }

  async submitConsents(
    userId: string,
    input: SubmitConsentRequestDto,
  ): Promise<ConsentStatusResponseDto> {
    const validatedInput = this.validateInput(input);
    const records = this.buildConsentRecords(validatedInput);
    const consents = await this.consentRepository.upsertMany(userId, records);

    return ConsentStatusResponseDto.from(consents);
  }

  private validateInput(
    input: SubmitConsentRequestDto,
  ): SubmitConsentRequestDto {
    const version = this.validateVersion(input?.version);
    const terms = this.validateBoolean(input?.terms, '이용약관 동의(terms)');
    const privacy = this.validateBoolean(
      input?.privacy,
      '개인정보 수집·이용 동의(privacy)',
    );
    const age = this.validateBoolean(input?.age, '만 14세 이상 확인(age)');
    const marketing = this.validateBoolean(
      input?.marketing,
      '마케팅 정보 수신 동의(marketing)',
    );
    const location = this.validateBoolean(
      input?.location,
      '위치기반 서비스 동의(location)',
    );

    if (!terms || !privacy || !age) {
      throw new BadRequestException(
        '이용약관, 개인정보 수집·이용, 만 14세 이상 확인은 모두 동의해야 가입할 수 있습니다.',
      );
    }

    return { version, terms, privacy, age, marketing, location };
  }

  private validateVersion(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(
        '약관 버전(version) 값은 비어 있을 수 없습니다.',
      );
    }

    return value.trim();
  }

  private validateBoolean(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${label} 값은 boolean이어야 합니다.`);
    }

    return value;
  }

  private buildConsentRecords(
    input: SubmitConsentRequestDto,
  ): ConsentRecordInput[] {
    const agreementByType: Record<ConsentType, boolean> = {
      TERMS: input.terms,
      PRIVACY: input.privacy,
      AGE: input.age,
      MARKETING: input.marketing,
      LOCATION: input.location,
    };

    return (Object.keys(agreementByType) as ConsentType[]).map((type) => ({
      type,
      scope: CONSENT_SCOPE_BY_TYPE[type],
      isAgreed: agreementByType[type],
      version: input.version,
    }));
  }
}
