import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { SeriesDto, SeriesWatchResultDto, UpdateSynopsisRequestDto } from '@ceviu/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';

/** Cliente HTTP do catalogo de series (`/series`). */
@Injectable({ providedIn: 'root' })
export class SeriesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/series`;

  list(): Observable<SeriesDto[]> {
    return this.http.get<SeriesDto[]>(this.baseUrl);
  }

  get(id: number): Observable<SeriesDto> {
    return this.http.get<SeriesDto>(`${this.baseUrl}/${id}`);
  }

  updateSynopsis(id: number, payload: UpdateSynopsisRequestDto): Observable<SeriesDto> {
    return this.http.patch<SeriesDto>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Marca como assistida e soma a duracao (x1, paridade com o legado). */
  watch(id: number): Observable<SeriesWatchResultDto> {
    return this.http.post<SeriesWatchResultDto>(`${this.baseUrl}/${id}/watch`, {});
  }

  /** Favorita (tambem marca como assistida, sem somar tempo — paridade). */
  favorite(id: number): Observable<SeriesWatchResultDto> {
    return this.http.post<SeriesWatchResultDto>(`${this.baseUrl}/${id}/favorite`, {});
  }
}
