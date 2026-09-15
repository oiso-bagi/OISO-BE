import type { SocialAuthUser } from '@/auth/types/auth-user.types';

export interface AuthTokens {
  refreshToken: string;
}

export interface LocalAuthTokens extends AuthTokens {
  accessToken: string;
}

export interface LocalLoginResult {
  tokens: LocalAuthTokens;
}

export interface SocialLoginResult {
  user: SocialAuthUser;
  tokens: AuthTokens;
  isNewUser: boolean;
}
