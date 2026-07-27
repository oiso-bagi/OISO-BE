import type { User } from '@prisma/client';

export type UserIdOnly = Pick<User, 'id'>;
export type SocialAuthUser = Pick<
  User,
  | 'id'
  | 'email'
  | 'provider'
  | 'providerId'
  | 'nickname'
  | 'phone'
  | 'role'
  | 'birthDate'
  | 'isActive'
  | 'createdAt'
  | 'updatedAt'
>;
