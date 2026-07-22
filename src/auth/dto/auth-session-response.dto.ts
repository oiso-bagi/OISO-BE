export class AuthSessionResponseDto {
  authenticated!: boolean;

  static from(authenticated: boolean): AuthSessionResponseDto {
    return {
      authenticated,
    };
  }
}
