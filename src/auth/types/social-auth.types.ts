import { UserProvider } from '@prisma/client';

/// 소셜 로그인 제공자(카카오, 구글 등)로부터 정규화된 프로필 정보를 표현하는 공통 인터페이스입니다.
export interface SocialUserProfile {
  providerId: string;
  email: string;
  nickname: string;
}

export const SOCIAL_PROVIDER = {
  KAKAO: UserProvider.KAKAO,
  GOOGLE: UserProvider.GOOGLE,
} as const;

export type SocialProvider =
  (typeof SOCIAL_PROVIDER)[keyof typeof SOCIAL_PROVIDER];
