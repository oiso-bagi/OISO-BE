/// <reference types="jest" />

import type { Request } from 'express';
import { AuthController } from '@/auth/controllers/auth.controller';

describe('AuthController', () => {
  const controller = Object.create(AuthController.prototype) as AuthController;

  describe('OAuth callback URL', () => {
    it('builds a local callback URL from the request host', () => {
      const request = {
        protocol: 'http',
        headers: {
          host: 'localhost:3000',
        },
      } as Request;

      expect(controller['getOAuthCallbackUrl'](request, 'kakao')).toBe(
        'http://localhost:3000/api/v1/auth/kakao/callback',
      );
    });

    it('builds a deployed callback URL from forwarded proxy headers', () => {
      const request = {
        protocol: 'http',
        headers: {
          host: 'internal.railway.app',
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'oiso-be-production.up.railway.app',
        },
      } as unknown as Request;

      expect(controller['getOAuthCallbackUrl'](request, 'google')).toBe(
        'https://oiso-be-production.up.railway.app/api/v1/auth/google/callback',
      );
    });
  });
});
