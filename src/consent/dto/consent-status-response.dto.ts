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

  static from(consents: ConsentItemResponse[]): ConsentStatusResponseDto {
    const items: ConsentItemResponse[] = consents.map((consent) => ({
      type: consent.type,
      scope: consent.scope,
      isAgreed: consent.isAgreed,
      version: consent.version,
      agreedAt: consent.agreedAt,
      revokedAt: consent.revokedAt,
    }));

    const hasCompletedRequiredConsents = REQUIRED_CONSENT_TYPES.every(
      (type) => getLatestConsentByType(items, type)?.isAgreed === true,
    );

    return {
      hasCompletedRequiredConsents,
      consents: items,
    };
  }
}

/// 특정 약관 유형에 대해 가장 최근에 생성된(=최신 버전) 동의 이력을 반환합니다.
/// (agreedAt은 최초 upsert 시점에 고정되므로 버전 최신성을 나타내는 기준으로 사용합니다.)
function getLatestConsentByType(
  items: ConsentItemResponse[],
  type: ConsentType,
): ConsentItemResponse | undefined {
  return items
    .filter((item) => item.type === type)
    .reduce<ConsentItemResponse | undefined>((latest, item) => {
      if (!latest || item.agreedAt.getTime() > latest.agreedAt.getTime()) {
        return item;
      }
      return latest;
    }, undefined);
}
