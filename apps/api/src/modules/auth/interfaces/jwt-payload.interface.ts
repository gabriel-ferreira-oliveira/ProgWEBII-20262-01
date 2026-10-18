export interface JwtPayload {
  readonly sub: number;
  readonly email: string;
}

export interface AuthenticatedUser {
  readonly id: number;
  readonly email: string;
}
