import type { SocialAuthUser } from '@/auth/types/auth-user.types';

export interface AuthTokens {
  refreshToken: string;
}

export interface SocialLoginResult {
  user: SocialAuthUser;
  tokens: AuthTokens;
  isNewUser: boolean;
}
