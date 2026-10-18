import { registerAs } from '@nestjs/config';

export interface AppConfig {
  readonly port: number;
  readonly jwtSecret: string;
  readonly jwtExpiresIn: string;
  readonly bcryptRounds: number;
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInteger(process.env.PORT, 3000),
    jwtSecret: process.env.JWT_SECRET ?? 'troque-este-segredo',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    bcryptRounds: parseInteger(process.env.BCRYPT_ROUNDS, 10),
  }),
);
