import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { MovieDto, MovieWatchResultDto, UpdateSynopsisRequestDto } from '@ceviu/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';

/** Cliente HTTP do catalogo de filmes (`/movies`). */
@Injectable({ providedIn: 'root' })
export class MoviesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/movies`;

  list(): Observable<MovieDto[]> {
    return this.http.get<MovieDto[]>(this.baseUrl);
  }

  get(id: number): Observable<MovieDto> {
    return this.http.get<MovieDto>(`${this.baseUrl}/${id}`);
  }

  updateSynopsis(id: number, payload: UpdateSynopsisRequestDto): Observable<MovieDto> {
    return this.http.patch<MovieDto>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Marca como assistido e soma a duracao ao tempo do usuario. */
  watch(id: number): Observable<MovieWatchResultDto> {
    return this.http.post<MovieWatchResultDto>(`${this.baseUrl}/${id}/watch`, {});
  }

  /** Favorita (tambem marca como assistido, somando a duracao — D-04). */
  favorite(id: number): Observable<MovieWatchResultDto> {
    return this.http.post<MovieWatchResultDto>(`${this.baseUrl}/${id}/favorite`, {});
  }
}
