import { Injectable } from '@nestjs/common';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT_ALGORITHM = 'scrypt';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

@Injectable()
export class PasswordHashService {
  hashPassword(password: string): string {
    const salt = randomBytes(16).toString('base64url');
    const hash = this.deriveKey(password, salt).toString('base64url');

    return [SCRYPT_ALGORITHM, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt, hash].join(
      '$',
    );
  }

  verifyPassword(password: string, passwordHash: string | null): boolean {
    if (!passwordHash) {
      return false;
    }

    const parsedHash = this.parseHash(passwordHash);

    if (!parsedHash) {
      return false;
    }

    const { salt, expectedHash, n, r, p } = parsedHash;
    const derivedHash = scryptSync(password, salt, KEY_LENGTH, {
      N: n,
      r,
      p,
    });

    return (
      expectedHash.length === derivedHash.length &&
      timingSafeEqual(expectedHash, derivedHash)
    );
  }

  private deriveKey(password: string, salt: string): Buffer {
    return scryptSync(password, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
  }

  private parseHash(passwordHash: string):
    | {
        salt: string;
        expectedHash: Buffer;
        n: number;
        r: number;
        p: number;
      }
    | undefined {
    const [algorithm, rawN, rawR, rawP, salt, rawHash] =
      passwordHash.split('$');

    if (algorithm !== SCRYPT_ALGORITHM || !salt || !rawHash) {
      return undefined;
    }

    const n = Number(rawN);
    const r = Number(rawR);
    const p = Number(rawP);

    if (n !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) {
      return undefined;
    }

    try {
      return {
        salt,
        expectedHash: Buffer.from(rawHash, 'base64url'),
        n,
        r,
        p,
      };
    } catch {
      return undefined;
    }
  }
}
