import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface TokenPayload {
  sub: string;
  provider: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  issueAccessToken(userId: string, provider: string): string {
    return this.jwtService.sign(
      {
        sub: userId,
        provider,
        type: 'access',
      },
      {
        secret: this.getRequiredEnv('JWT_ACCESS_SECRET'),
        expiresIn: this.getDurationSeconds(
          process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
        ),
      },
    );
  }

  issueRefreshToken(userId: string, provider: string): string {
    return this.jwtService.sign(
      {
        sub: userId,
        provider,
        type: 'refresh',
      },
      {
        secret: this.getRequiredEnv('JWT_REFRESH_SECRET'),
        expiresIn: this.getDurationSeconds(
          process.env.JWT_REFRESH_EXPIRES_IN ?? '14d',
        ),
      },
    );
  }

  verifyAccessToken(token: string): TokenPayload {
    const payload = this.verifyToken(
      token,
      this.getRequiredEnv('JWT_ACCESS_SECRET'),
    );

    if (payload.type !== 'access') {
      throw new UnauthorizedException('유효하지 않은 액세스 토큰입니다.');
    }

    return payload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    const payload = this.verifyToken(
      token,
      this.getRequiredEnv('JWT_REFRESH_SECRET'),
    );

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    return payload;
  }

  private verifyToken(token: string, secret: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(token, { secret });
    } catch (error) {
      if (this.isTokenExpiredError(error)) {
        throw new UnauthorizedException('토큰이 만료되었습니다.');
      }

      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new InternalServerErrorException(`${name} 설정이 누락되었습니다.`);
    }

    return value;
  }

  private getDurationSeconds(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new InternalServerErrorException(
        'JWT 만료 시간 설정 형식이 올바르지 않습니다.',
      );
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

  private isTokenExpiredError(error: unknown): boolean {
    return error instanceof Error && error.name === 'TokenExpiredError';
  }
}
