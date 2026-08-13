/// <reference types="jest" />

import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';

describe('AuthCookieService', () => {
  let service: AuthCookieService;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    service = new AuthCookieService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getBaseCookieOptions', () => {
    it('uses secure SameSite=None cookies in production by default', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_SECURE;

      expect(service.getBaseCookieOptions()).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
    });

    it('uses SameSite=Lax cookies outside production by default', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.COOKIE_SECURE;

      expect(service.getBaseCookieOptions()).toMatchObject({
        secure: false,
        sameSite: 'lax',
      });
    });

    it('uses COOKIE_SECURE as the explicit cross-site cookie switch', () => {
      process.env.NODE_ENV = 'development';
      process.env.COOKIE_SECURE = 'true';

      expect(service.getBaseCookieOptions()).toMatchObject({
        secure: true,
        sameSite: 'none',
      });

      process.env.NODE_ENV = 'production';
      process.env.COOKIE_SECURE = 'false';

      expect(service.getBaseCookieOptions()).toMatchObject({
        secure: false,
        sameSite: 'lax',
      });
    });

    it.each(['TRUE', '', 'ture'])(
      'rejects invalid COOKIE_SECURE value %p',
      (value) => {
        process.env.NODE_ENV = 'production';
        process.env.COOKIE_SECURE = value;

        expect(() => service.getBaseCookieOptions()).toThrow(
          InternalServerErrorException,
        );
        expect(() => service.getBaseCookieOptions()).toThrow(
          '서버 설정 오류가 발생했습니다.',
        );
      },
    );
  });

  describe('OAuth redirect URLs', () => {
    it('accepts a relative returnUrl and appends the login success marker', () => {
      expect(service.getSafeOAuthReturnUrl('/routes/route-id?tab=map')).toBe(
        '/routes/route-id?tab=map',
      );
      expect(service.getSuccessRedirectUrl('/routes/route-id?tab=map')).toBe(
        'http://localhost:5173/routes/route-id?tab=map&login=success',
      );
    });

    it('accepts same-origin absolute returnUrl and rejects external origins', () => {
      process.env.FRONTEND_AUTH_SUCCESS_REDIRECT =
        'https://oiso.example.com/auth/success';

      expect(
        service.getSafeOAuthReturnUrl('https://oiso.example.com/routes/1'),
      ).toBe('https://oiso.example.com/routes/1');
      expect(
        service.getSafeOAuthReturnUrl('https://attacker.example.com/routes/1'),
      ).toBeUndefined();
    });

    it('accepts absolute returnUrl values from any configured frontend origin', () => {
      process.env.FRONTEND_ORIGIN =
        'https://app.example.com, https://admin.example.com/path';

      expect(
        service.getSafeOAuthReturnUrl('https://admin.example.com/routes/1'),
      ).toBe('https://admin.example.com/routes/1');
      expect(service.getSuccessRedirectUrl('/routes/1')).toBe(
        'https://app.example.com/routes/1?login=success',
      );
    });

    it('accepts absolute returnUrl values from configured wildcard origins', () => {
      process.env.FRONTEND_ORIGIN =
        'https://oiso-bagi.vercel.app, https://*.vercel.app';

      expect(
        service.getSafeOAuthReturnUrl(
          'https://oiso-bagi-git-main.vercel.app/routes/1',
        ),
      ).toBe('https://oiso-bagi-git-main.vercel.app/routes/1');
    });

    it('rejects backslash returnUrl values parsed as external origins', () => {
      expect(
        service.getSafeOAuthReturnUrl('/\\attacker.example.com/phish'),
      ).toBeUndefined();
    });

    it('builds the consent redirect URL for new social users', () => {
      process.env.FRONTEND_AUTH_CONSENT_REDIRECT = '/terms';

      expect(service.getConsentRedirectUrl()).toBe(
        'http://localhost:5173/terms?login=success',
      );
    });
  });

  describe('getFailureReason', () => {
    it.each([
      [
        'kakao_canceled',
        new BadRequestException('카카오 로그인이 취소되었습니다.'),
        'kakao_canceled',
      ],
      [
        'google_canceled',
        new BadRequestException('구글 로그인이 취소되었습니다.'),
        'google_canceled',
      ],
      [
        'token_exchange_failed',
        new BadRequestException(
          '구글 인증 코드를 토큰으로 교환하지 못했습니다.',
        ),
        'token_exchange_failed',
      ],
      [
        'profile_fetch_failed',
        new BadRequestException('구글 사용자 프로필 조회에 실패했습니다.'),
        'profile_fetch_failed',
      ],
      [
        'email_required',
        new BadRequestException('구글 계정 이메일이 필요합니다.'),
        'email_required',
      ],
      [
        'nickname_required',
        new BadRequestException('구글 계정 닉네임이 필요합니다.'),
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
          new ConflictException('이미 다른 계정에 연결된 이메일입니다.'),
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
            message: '구글 사용자 프로필 조회에 실패했습니다.',
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
