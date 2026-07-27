/// <reference types="jest" />

import { ConflictException } from '@nestjs/common';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';

describe('AuthCookieService', () => {
  let service: AuthCookieService;

  beforeEach(() => {
    service = new AuthCookieService();
  });

  describe('getFailureReason', () => {
    it('returns email_conflict when a social email already belongs to another account', () => {
      expect(
        service.getFailureReason(
          new ConflictException('Email is already linked to another account.'),
        ),
      ).toBe('email_conflict');
    });
  });
});
