import type { SocialUserProfile } from '@/auth/types/social-auth.types';

export interface KakaoTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

export interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

export type KakaoUserProfile = SocialUserProfile;
