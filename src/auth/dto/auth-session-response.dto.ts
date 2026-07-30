import { ApiProperty } from '@nestjs/swagger';

export class AuthSessionResponseDto {
  @ApiProperty({
    description: '현재 요청에 유효한 인증 세션이 있는지 여부',
    example: true,
  })
  authenticated!: boolean;

  static from(authenticated: boolean): AuthSessionResponseDto {
    return {
      authenticated,
    };
  }
}
