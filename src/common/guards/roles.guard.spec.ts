import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '@/common/guards/auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  let guard: RolesGuard;

  const createContext = (
    user?: Partial<AuthenticatedRequest['user']>,
  ): ExecutionContext =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'controller',
      switchToHttp: () => ({
        getRequest: () =>
          ({
            user,
          }) as AuthenticatedRequest,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows requests when no roles metadata is defined', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows a user with one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(
      guard.canActivate(
        createContext({ id: 'admin-id', role: UserRole.ADMIN }),
      ),
    ).toBe(true);
  });

  it('rejects a user without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() =>
      guard.canActivate(createContext({ id: 'user-id', role: UserRole.USER })),
    ).toThrow(ForbiddenException);
  });
});
