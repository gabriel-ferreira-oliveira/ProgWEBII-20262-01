import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { LoginRequestDto, LoginResponseDto, RegisterRequestDto, UserProfileDto } from '@ceviu/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';

/** Cliente HTTP dos endpoints de autenticacao (sem guard/interceptor de token). */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/auth`;

  login(payload: LoginRequestDto): Observable<LoginResponseDto> {
    return this.http.post<LoginResponseDto>(`${this.baseUrl}/login`, payload);
  }

  register(payload: RegisterRequestDto): Observable<UserProfileDto> {
    return this.http.post<UserProfileDto>(`${this.baseUrl}/register`, payload);
  }
}
