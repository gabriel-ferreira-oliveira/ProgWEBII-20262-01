import { Injectable, computed, inject, signal } from '@angular/core';
import type { LoginRequestDto, LoginResponseDto, UserProfileDto } from '@ceviu/shared';
import { Observable, tap } from 'rxjs';
import { AuthApiService } from './auth-api.service';
import { AUTH_STORAGE_KEY, isAuthSession } from './auth-session';
import type { AuthSession } from './auth-session';

function readStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isAuthSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Sessao do usuario logado (token JWT + perfil) para toda a aplicacao. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly sessionSignal = signal<AuthSession | null>(readStoredSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly token = computed(() => this.sessionSignal()?.token ?? null);
  readonly currentUser = computed<UserProfileDto | null>(() => this.sessionSignal()?.user ?? null);

  login(credentials: LoginRequestDto): Observable<LoginResponseDto> {
    return this.api
      .login(credentials)
      .pipe(tap((response) => this.storeSession({ token: response.token, user: response.user })));
  }

  logout(): void {
    this.sessionSignal.set(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // armazenamento indisponivel: a sessao em memoria ja foi encerrada
    }
  }

  private storeSession(session: AuthSession): void {
    this.sessionSignal.set(session);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // sem persistencia: mantem apenas em memoria
    }
  }
}
