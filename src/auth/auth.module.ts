import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { AuthTokenService } from './services/auth-token.service';
import { KakaoAuthService } from './services/kakao-auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthTokenService, KakaoAuthService],
})
export class AuthModule {}
