import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '@/auth/controllers/auth.controller';
import { AuthRepository } from '@/auth/repositories/auth.repository';
import { AuthCookieService } from '@/auth/services/auth-cookie.service';
import { AuthService } from '@/auth/services/auth.service';
import { AuthTokenService } from '@/auth/services/auth-token.service';
import { KakaoAuthService } from '@/auth/services/kakao-auth.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    AuthTokenService,
    AuthCookieService,
    KakaoAuthService,
    AuthGuard,
  ],
  exports: [AuthService, AuthCookieService, AuthGuard],
})
export class AuthModule {}
