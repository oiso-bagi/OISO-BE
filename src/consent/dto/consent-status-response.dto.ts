import { ConsentType, UserConsent } from '@prisma/client';

const REQUIRED_CONSENT_TYPES: ConsentType[] = ['TERMS', 'PRIVACY', 'AGE'];

export interface ConsentItemResponse {
  type: ConsentType;
  scope: UserConsent['scope'];
  isAgreed: boolean;
  version: string;
  agreedAt: Date;
  revokedAt: Date | null;
}

/// 약관 동의 현황 조회/제출 응답 형태입니다.
export class ConsentStatusResponseDto {
  hasCompletedRequiredConsents!: boolean; /// 필수 약관(이용약관/개인정보/만 14세) 동의 완료 여부
  consents!: ConsentItemResponse[]; /// 유저의 약관별 동의 이력 목록

  static from(consents: UserConsent[]): ConsentStatusResponseDto {
    const items: ConsentItemResponse[] = consents.map((consent) => ({
      type: consent.type,
      scope: consent.scope,
      isAgreed: consent.isAgreed,
      version: consent.version,
      agreedAt: consent.agreedAt,
      revokedAt: consent.revokedAt,
    }));

    const hasCompletedRequiredConsents = REQUIRED_CONSENT_TYPES.every((type) =>
      items.some((item) => item.type === type && item.isAgreed),
    );

    return {
      hasCompletedRequiredConsents,
      consents: items,
    };
  }
}
