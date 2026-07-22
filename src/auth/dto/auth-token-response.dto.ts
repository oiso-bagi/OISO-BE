export class AuthTokenResponseDto {
  accessToken!: string;
  tokenType!: string;

  static from(accessToken: string): AuthTokenResponseDto {
    return {
      accessToken,
      tokenType: 'Bearer',
    };
  }
}
