import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { CurrentUserResponseDto } from '@/auth/dto/current-user-response.dto';

describe('CurrentUserResponseDto', () => {
  it('includes the user role in the current user response', () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      passwordHash: null,
      provider: 'google',
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
      provider: 'google',
      role: UserRole.ADMIN,
    });
  });
});
