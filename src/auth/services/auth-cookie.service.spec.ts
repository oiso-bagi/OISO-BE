/// <reference types="jest" />

import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';

describe('AuthCookieService', () => {
  let service: AuthCookieService;

  beforeEach(() => {
    service = new AuthCookieService();
  });

  describe('getFailureReason', () => {
    it.each([
      [
        'kakao_canceled',
        new BadRequestException('Kakao login was canceled.'),
        'kakao_canceled',
      ],
      [
        'google_canceled',
        new BadRequestException('Google login was canceled.'),
        'google_canceled',
      ],
      [
        'token_exchange_failed',
        new BadRequestException(
          'Failed to exchange Google authorization code.',
        ),
        'token_exchange_failed',
      ],
      [
        'profile_fetch_failed',
        new BadRequestException('Failed to fetch Google user profile.'),
        'profile_fetch_failed',
      ],
      [
        'email_required',
        new BadRequestException('Google account email is required.'),
        'email_required',
      ],
      [
        'nickname_required',
        new BadRequestException('Google account nickname is required.'),
        'nickname_required',
      ],
    ])(
      'returns %s for matching BadRequestException messages',
      (_, error, reason) => {
        expect(service.getFailureReason(error)).toBe(reason);
      },
    );

    it('returns email_conflict when a social email already belongs to another account', () => {
      expect(
        service.getFailureReason(
          new ConflictException('Email is already linked to another account.'),
        ),
      ).toBe('email_conflict');
    });

    it('returns email_conflict for normalized conflict exceptions', () => {
      expect(
        service.getFailureReason(new ConflictException('email_conflict')),
      ).toBe('email_conflict');
    });

    it('uses the response message field before the fallback exception message', () => {
      expect(
        service.getFailureReason(
          new BadRequestException({
            message: 'Failed to fetch Google user profile.',
          }),
        ),
      ).toBe('profile_fetch_failed');
    });

    it('does not classify unrelated messages as OAuth-specific failures', () => {
      expect(
        service.getFailureReason(
          new BadRequestException(
            'Google profile display name is unavailable.',
          ),
        ),
      ).toBe('server_error');
    });
  });
});
