/// <reference types="jest" />

import { PasswordHashService } from '@/auth/services/password-hash.service';

describe('PasswordHashService', () => {
  let service: PasswordHashService;

  beforeEach(() => {
    service = new PasswordHashService();
  });

  it('verifies a password against its hash', () => {
    const passwordHash = service.hashPassword('correct-password');

    expect(service.verifyPassword('correct-password', passwordHash)).toBe(true);
    expect(service.verifyPassword('wrong-password', passwordHash)).toBe(false);
  });

  it('rejects empty and unsupported hashes', () => {
    expect(service.verifyPassword('password', null)).toBe(false);
    expect(service.verifyPassword('password', 'unsupported-hash')).toBe(false);
  });
});
