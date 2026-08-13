/// <reference types="jest" />

import {
  isAllowedFrontendOrigin,
  LOCAL_FRONTEND_ORIGIN,
  parseFrontendOriginRules,
  parseFrontendOrigins,
  resolveFrontendOriginRules,
  resolveFrontendOrigins,
} from '@/common/config/frontend-origin.config';

describe('frontend origin config', () => {
  describe('parseFrontendOrigins', () => {
    it('trims, filters empty values, and normalizes origins', () => {
      expect(
        parseFrontendOrigins(
          ' https://app.example.com/path , , http://localhost:5173/callback ',
        ),
      ).toEqual(['https://app.example.com', 'http://localhost:5173']);
    });

    it('rejects non-http origins', () => {
      expect(() => parseFrontendOrigins('ftp://app.example.com')).toThrow(
        'FRONTEND_ORIGIN only supports http and https origins.',
      );
    });
  });

  describe('parseFrontendOriginRules', () => {
    it('separates exact origins and wildcard origin patterns', () => {
      const rules = parseFrontendOriginRules(
        'https://oiso-bagi.vercel.app, https://oiso-bagi-*.vercel.app',
      );

      expect(rules.exactOrigins).toEqual(['https://oiso-bagi.vercel.app']);
      expect(
        isAllowedFrontendOrigin('https://oiso-bagi-git-main.vercel.app', rules),
      ).toBe(true);
      expect(isAllowedFrontendOrigin('https://preview.vercel.app', rules)).toBe(
        false,
      );
      expect(isAllowedFrontendOrigin('https://example.com', rules)).toBe(false);
    });
  });

  describe('resolveFrontendOrigins', () => {
    it('uses the local frontend origin when FRONTEND_ORIGIN is unset outside production', () => {
      expect(resolveFrontendOrigins(undefined, 'development')).toEqual([
        LOCAL_FRONTEND_ORIGIN,
      ]);
    });

    it('rejects delimiter-only FRONTEND_ORIGIN values in production', () => {
      expect(() => resolveFrontendOrigins(' , , ', 'production')).toThrow(
        'FRONTEND_ORIGIN must include at least one origin.',
      );
    });
  });

  describe('resolveFrontendOriginRules', () => {
    it('allows wildcard-only origins in production', () => {
      const rules = resolveFrontendOriginRules(
        'https://oiso-bagi-*.vercel.app',
        'production',
      );

      expect(rules.exactOrigins).toEqual([]);
      expect(
        isAllowedFrontendOrigin('https://oiso-bagi-preview.vercel.app', rules),
      ).toBe(true);
      expect(isAllowedFrontendOrigin('https://preview.vercel.app', rules)).toBe(
        false,
      );
    });
  });
});
