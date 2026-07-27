import type { SocialUserProfile } from '@/auth/types/social-auth.types';

export interface GoogleTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

export interface GoogleUserResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

export type GoogleUserProfile = SocialUserProfile;
