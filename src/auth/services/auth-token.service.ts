import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

interface TokenPayload {
  sub: string;
  provider: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

@Injectable()
export class AuthTokenService {
  issueAccessToken(userId: string, provider: string): string {
    return this.sign(
      {
        sub: userId,
        provider,
        type: 'access',
      },
      this.getRequiredEnv('JWT_ACCESS_SECRET'),
      this.getDurationSeconds(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'),
    );
  }

  issueRefreshToken(userId: string, provider: string): string {
    return this.sign(
      {
        sub: userId,
        provider,
        type: 'refresh',
      },
      this.getRequiredEnv('JWT_REFRESH_SECRET'),
      this.getDurationSeconds(process.env.JWT_REFRESH_EXPIRES_IN ?? '14d'),
    );
  }

  verifyAccessToken(token: string): TokenPayload {
    const payload = this.verify(
      token,
      this.getRequiredEnv('JWT_ACCESS_SECRET'),
    );

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }

    return payload;
  }

  private sign(
    payload: Omit<TokenPayload, 'iat' | 'exp'>,
    secret: string,
    expiresInSeconds: number,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };
    const header = this.base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
    const body = this.base64UrlEncode(fullPayload);
    const signature = this.createSignature(`${header}.${body}`, secret);

    return `${header}.${body}.${signature}`;
  }

  private verify(token: string, secret: string): TokenPayload {
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const [header, body, signature] = parts;
    const expectedSignature = this.createSignature(`${header}.${body}`, secret);

    if (!this.isEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8'),
    ) as TokenPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Expired access token.');
    }

    return payload;
  }

  private createSignature(value: string, secret: string): string {
    return createHmac('sha256', secret).update(value).digest('base64url');
  }

  private base64UrlEncode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
  }

  private isEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private getDurationSeconds(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new InternalServerErrorException('Invalid JWT expiration config.');
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return amount * multipliers[unit];
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured.`);
    }

    return value;
  }
}
