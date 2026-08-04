/// <reference types="jest" />

import {
  LOCAL_FRONTEND_ORIGIN,
  parseFrontendOrigins,
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
});
