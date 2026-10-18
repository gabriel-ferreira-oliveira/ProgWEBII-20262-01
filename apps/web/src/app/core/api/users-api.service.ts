import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  FavoriteEntryDto,
  UserDetailDto,
  UserSummaryDto,
  WatchedEntryDto,
} from '@ceviu/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';

/** Cliente HTTP da comunidade e dos perfis (`/users`). */
@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/users`;

  /** Lista a comunidade (a API exclui o usuario logado). */
  list(): Observable<UserSummaryDto[]> {
    return this.http.get<UserSummaryDto[]>(this.baseUrl);
  }

  /** Perfil + tempos assistidos. */
  detail(id: number): Observable<UserDetailDto> {
    return this.http.get<UserDetailDto>(`${this.baseUrl}/${id}`);
  }

  watchedMovies(id: number): Observable<WatchedEntryDto[]> {
    return this.http.get<WatchedEntryDto[]>(`${this.baseUrl}/${id}/watched-movies`);
  }

  watchedSeries(id: number): Observable<WatchedEntryDto[]> {
    return this.http.get<WatchedEntryDto[]>(`${this.baseUrl}/${id}/watched-series`);
  }

  favorites(id: number): Observable<FavoriteEntryDto[]> {
    return this.http.get<FavoriteEntryDto[]>(`${this.baseUrl}/${id}/favorites`);
  }
}
