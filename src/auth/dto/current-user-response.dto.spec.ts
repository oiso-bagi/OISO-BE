import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUserResponseDto } from '@/auth/dto/current-user-response.dto';

describe('CurrentUserResponseDto', () => {
  it('includes the user role in the current user response', () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: null,
      provider: 'GOOGLE',
      providerId: 'google-user-id',
      nickname: 'traveler',
      phone: null,
      role: UserRole.ADMIN,
      birthDate: null,
      isActive: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    } satisfies User;

    expect(CurrentUserResponseDto.from(user)).toEqual({
      id: 'user-id',
      email: 'user@example.com',
      nickname: 'traveler',
      provider: 'GOOGLE',
      role: UserRole.ADMIN,
    });
  });

  it('returns the Google display name without the stored provider suffix', () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: null,
      provider: 'GOOGLE',
      providerId: '104948493428550008298',
      nickname: '김민지_104948493428550008298',
      phone: null,
      role: UserRole.USER,
      birthDate: null,
      isActive: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    } satisfies User;

    expect(CurrentUserResponseDto.from(user)).toEqual({
      id: 'user-id',
      email: 'user@example.com',
      nickname: '김민지',
      provider: 'GOOGLE',
      role: UserRole.USER,
    });
  });

  it('returns the Google display name without a retried provider suffix', () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: null,
      provider: 'GOOGLE',
      providerId: '104948493428550008298',
      nickname: '김민지_104948493428550008298_2',
      phone: null,
      role: UserRole.USER,
      birthDate: null,
      isActive: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    } satisfies User;

    expect(CurrentUserResponseDto.from(user).nickname).toBe('김민지');
  });

  it('keeps non-Google nicknames unchanged', () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: null,
      provider: 'KAKAO',
      providerId: '123',
      nickname: 'traveler_123',
      phone: null,
      role: UserRole.USER,
      birthDate: null,
      isActive: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    } satisfies User;

    expect(CurrentUserResponseDto.from(user).nickname).toBe('traveler_123');
  });
});
