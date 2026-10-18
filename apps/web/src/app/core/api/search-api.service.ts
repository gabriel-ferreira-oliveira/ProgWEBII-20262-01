import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { SearchRequestDto, SearchResultDto } from '@ceviu/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';

/** Cliente HTTP da pesquisa (`/search`; exatamente um filtro: title ou id). */
@Injectable({ providedIn: 'root' })
export class SearchApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/search`;

  search(request: SearchRequestDto): Observable<SearchResultDto> {
    let params = new HttpParams();
    if (request.id !== undefined) {
      params = params.set('id', request.id);
    } else if (request.title !== undefined) {
      params = params.set('title', request.title);
    }
    return this.http.get<SearchResultDto>(this.baseUrl, { params });
  }

  searchByTitle(title: string): Observable<SearchResultDto> {
    return this.search({ title });
  }

  searchById(id: number): Observable<SearchResultDto> {
    return this.search({ id });
  }
}
