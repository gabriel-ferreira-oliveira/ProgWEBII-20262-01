import type { UserProfileDto } from '@ceviu/shared';

/** Sessao autenticada mantida no navegador (token JWT + usuario logado). */
export interface AuthSession {
  readonly token: string;
  readonly user: UserProfileDto;
}

export const AUTH_STORAGE_KEY = 'ceviu.auth';

function isUserProfile(value: unknown): value is UserProfileDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'number' &&
    typeof candidate['name'] === 'string' &&
    typeof candidate['email'] === 'string'
  );
}

export function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate['token'] === 'string' && isUserProfile(candidate['user']);
}
