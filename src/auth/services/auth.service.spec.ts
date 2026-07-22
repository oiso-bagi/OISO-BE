/// <reference types="jest" />

import { UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';

describe('AuthService', () => {
  const mockAuthRepository = {
    findUserByProvider: jest.fn(),
    findUserByNickname: jest.fn(),
    createKakaoUser: jest.fn(),
    updateKakaoUser: jest.fn(),
    findUserById: jest.fn(),
  };
  const mockAuthTokenService = {
    issueAccessToken: jest.fn(),
    issueRefreshToken: jest.fn(),
    verifyAccessToken: jest.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockAuthRepository as unknown as AuthRepository,
      mockAuthTokenService as unknown as AuthTokenService,
    );
    mockAuthTokenService.issueAccessToken.mockReturnValue('access-token');
    mockAuthTokenService.issueRefreshToken.mockReturnValue('refresh-token');
  });

  it('creates a Kakao user on first login', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      nickname: 'user',
      provider: 'kakao',
    };
    mockAuthRepository.findUserByProvider.mockResolvedValue(null);
    mockAuthRepository.findUserByNickname.mockResolvedValue(null);
    mockAuthRepository.createKakaoUser.mockResolvedValue(user);

    await expect(
      service.loginWithKakao({
        providerId: '123',
        email: 'user@example.com',
        nickname: 'user',
      }),
    ).resolves.toEqual({
      user,
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    expect(mockAuthRepository.createKakaoUser).toHaveBeenCalledWith(
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
    mockAuthRepository.updateKakaoUser.mockResolvedValue(updatedUser);

    await service.loginWithKakao({
      providerId: '123',
      email: 'new@example.com',
      nickname: 'user',
    });

    expect(mockAuthRepository.updateKakaoUser).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ email: 'new@example.com' }),
    );
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
});
