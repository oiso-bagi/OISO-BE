/// <reference types="jest" />

import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthRepository } from '@/auth/repositories/auth.repository';
import { AuthService } from '@/auth/services/auth.service';
import { AuthTokenService } from '@/auth/services/auth-token.service';
import { SocialAuthService } from '@/auth/services/social-auth.service';

describe('AuthService', () => {
  const mockAuthRepository = {
    findUserByProvider: jest.fn(),
    findUserByNickname: jest.fn(),
    createSocialUser: jest.fn(),
    updateSocialUser: jest.fn(),
    findUserById: jest.fn(),
  };
  const mockAuthTokenService = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
  let service: AuthService;
  let socialAuthService: SocialAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    socialAuthService = new SocialAuthService(
      mockAuthRepository as unknown as AuthRepository,
      mockAuthTokenService as unknown as AuthTokenService,
    );
    service = new AuthService(
      mockAuthRepository as unknown as AuthRepository,
      mockAuthTokenService as unknown as AuthTokenService,
      socialAuthService,
    );
    mockAuthTokenService.issueAccessToken.mockReturnValue('access-token');
    mockAuthTokenService.issueRefreshToken.mockReturnValue('refresh-token');
  });

  describe('loginWithKakao', () => {
    it('creates a Kakao user on first login', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        nickname: 'user',
        provider: 'kakao',
      };
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);
      mockAuthRepository.findUserByNickname.mockResolvedValue(null);
      mockAuthRepository.createSocialUser.mockResolvedValue(user);

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: true,
      });
      expect(mockAuthRepository.createSocialUser).toHaveBeenCalledWith(
        'kakao',
        expect.objectContaining({ providerId: '123' }),
        'user',
      );
    });

    it('updates an existing Kakao user on repeat login', async () => {
      const user = {
        id: 'user-id',
        email: 'old@example.com',
        nickname: 'user',
        provider: 'kakao',
      };
      const updatedUser = {
        ...user,
        email: 'new@example.com',
      };
      mockAuthRepository.findUserByProvider.mockResolvedValue(user);
      mockAuthRepository.updateSocialUser.mockResolvedValue(updatedUser);

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'new@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user: updatedUser,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: false,
      });

      expect(mockAuthRepository.updateSocialUser).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('reloads and updates an existing Kakao user after a create race', async () => {
      const createdByConcurrentCallback = {
        id: 'user-id',
        email: 'user@example.com',
        nickname: 'user',
        provider: 'kakao',
      };
      mockAuthRepository.findUserByProvider
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'user-id' });
      mockAuthRepository.findUserByNickname.mockResolvedValue(null);
      mockAuthRepository.createSocialUser.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );
      mockAuthRepository.updateSocialUser.mockResolvedValue(
        createdByConcurrentCallback,
      );

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user: createdByConcurrentCallback,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: false,
      });
      expect(mockAuthRepository.updateSocialUser).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ providerId: '123' }),
      );
    });

    it('creates a Kakao user with provider suffix when base nickname creation collides', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        nickname: 'user_123',
        provider: 'kakao',
      };
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);
      mockAuthRepository.findUserByNickname
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockAuthRepository.createSocialUser
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '5.22.0',
          }),
        )
        .mockResolvedValueOnce(user);

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: true,
      });
    });

    it('tries the next candidate when provider suffix nickname also collides', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        nickname: 'user_123_1',
        provider: 'kakao',
      };
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);
      mockAuthRepository.findUserByNickname
        .mockResolvedValueOnce({ id: 'existing-user-id' })
        .mockResolvedValueOnce({
          id: 'existing-suffix-user-id',
          nickname: 'user_123',
        })
        .mockResolvedValueOnce(null);
      mockAuthRepository.createSocialUser.mockResolvedValue(user);

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: true,
      });
    });

    it('throws a clear error when no nickname candidate succeeds', async () => {
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);
      mockAuthRepository.findUserByNickname.mockResolvedValue({
        id: 'existing-user-id',
      });

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects Kakao login when nickname is blank', async () => {
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'user@example.com',
          nickname: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects existing Kakao relogin when nickname is blank', async () => {
      mockAuthRepository.findUserByProvider.mockResolvedValue({
        id: 'user-id',
        provider: 'kakao',
      });

      await expect(
        service.loginWithKakao({
          providerId: '123',
          email: 'user@example.com',
          nickname: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthRepository.findUserByProvider).not.toHaveBeenCalled();
    });
  });

  describe('loginWithGoogle', () => {
    it('creates a Google user on first login', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        nickname: 'user',
        provider: 'google',
      };
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);
      mockAuthRepository.findUserByNickname.mockResolvedValue(null);
      mockAuthRepository.createSocialUser.mockResolvedValue(user);

      await expect(
        service.loginWithGoogle({
          providerId: 'google-123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: true,
      });
      expect(mockAuthRepository.createSocialUser).toHaveBeenCalledWith(
        'google',
        expect.objectContaining({ providerId: 'google-123' }),
        'user',
      );
    });

    it('updates an existing Google user on repeat login', async () => {
      const user = {
        id: 'user-id',
        email: 'old@example.com',
        nickname: 'user',
        provider: 'google',
      };
      const updatedUser = {
        ...user,
        email: 'new@example.com',
      };
      mockAuthRepository.findUserByProvider.mockResolvedValue(user);
      mockAuthRepository.updateSocialUser.mockResolvedValue(updatedUser);

      await expect(
        service.loginWithGoogle({
          providerId: 'google-123',
          email: 'new@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user: updatedUser,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: false,
      });

      expect(mockAuthRepository.findUserByProvider).toHaveBeenCalledWith(
        'google',
        'google-123',
      );
      expect(mockAuthRepository.updateSocialUser).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });

    it('rejects existing Google login when updated email belongs to another account', async () => {
      mockAuthRepository.findUserByProvider.mockResolvedValue({
        id: 'user-id',
      });
      mockAuthRepository.updateSocialUser.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: {
            target: ['email'],
          },
        }),
      );

      await expect(
        service.loginWithGoogle({
          providerId: 'google-123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).rejects.toThrow(new ConflictException('email_conflict'));
    });

    it('creates a Google user with provider suffix when base nickname creation collides', async () => {
      const user = {
        id: 'user-id',
        email: 'user@example.com',
        nickname: 'user_google-123',
        provider: 'google',
      };
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);
      mockAuthRepository.findUserByNickname
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockAuthRepository.createSocialUser
        .mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '5.22.0',
          }),
        )
        .mockResolvedValueOnce(user);

      await expect(
        service.loginWithGoogle({
          providerId: 'google-123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).resolves.toEqual({
        user,
        tokens: {
          refreshToken: 'refresh-token',
        },
        isNewUser: true,
      });
    });

    it('rejects Google login when the email belongs to another account', async () => {
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);
      mockAuthRepository.findUserByNickname.mockResolvedValue(null);
      mockAuthRepository.createSocialUser.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
          meta: {
            target: ['email'],
          },
        }),
      );

      await expect(
        service.loginWithGoogle({
          providerId: 'google-123',
          email: 'user@example.com',
          nickname: 'user',
        }),
      ).rejects.toThrow(ConflictException);
      expect(mockAuthRepository.createSocialUser).toHaveBeenCalledTimes(1);
    });

    it('rejects Google login when nickname is blank', async () => {
      mockAuthRepository.findUserByProvider.mockResolvedValue(null);

      await expect(
        service.loginWithGoogle({
          providerId: 'google-123',
          email: 'user@example.com',
          nickname: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('returns the current user from an access token', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      nickname: 'user',
      provider: 'kakao',
    };
    mockAuthTokenService.verifyAccessToken.mockReturnValue({ sub: 'user-id' });
    mockAuthRepository.findUserById.mockResolvedValue(user);

    await expect(service.getCurrentUser('access-token')).resolves.toBe(user);
  });

  it('rejects requests without an access token', async () => {
    await expect(service.getCurrentUser(undefined)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects current user requests when token user does not exist', async () => {
    mockAuthTokenService.verifyAccessToken.mockReturnValue({ sub: 'user-id' });
    mockAuthRepository.findUserById.mockResolvedValue(null);

    await expect(service.getCurrentUser('access-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('refreshes access tokens from a refresh token', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      nickname: 'user',
      provider: 'kakao',
    };
    mockAuthTokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-id' });
    mockAuthRepository.findUserById.mockResolvedValue(user);
    mockAuthTokenService.issueAccessToken.mockReturnValue('new-access-token');

    await expect(service.refreshAccessToken('refresh-token')).resolves.toBe(
      'new-access-token',
    );
  });

  it('rejects refresh requests without a refresh token', async () => {
    await expect(service.refreshAccessToken(undefined)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects refresh requests when token user does not exist', async () => {
    mockAuthTokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-id' });
    mockAuthRepository.findUserById.mockResolvedValue(null);

    await expect(service.refreshAccessToken('refresh-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns true when a refresh token belongs to an existing user', async () => {
    mockAuthTokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-id' });
    mockAuthRepository.findUserById.mockResolvedValue({
      id: 'user-id',
    });

    await expect(
      service.hasAuthenticatedSession('refresh-token'),
    ).resolves.toBe(true);
  });

  it('returns false when session refresh token is missing', async () => {
    await expect(service.hasAuthenticatedSession(undefined)).resolves.toBe(
      false,
    );
  });

  it('returns false when a refresh token user does not exist', async () => {
    mockAuthTokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-id' });
    mockAuthRepository.findUserById.mockResolvedValue(undefined);

    await expect(
      service.hasAuthenticatedSession('refresh-token'),
    ).resolves.toBe(false);
  });

  it('returns false when session refresh token is invalid', async () => {
    mockAuthTokenService.verifyRefreshToken.mockImplementation(() => {
      throw new UnauthorizedException();
    });

    await expect(
      service.hasAuthenticatedSession('invalid-refresh-token'),
    ).resolves.toBe(false);
  });
});
