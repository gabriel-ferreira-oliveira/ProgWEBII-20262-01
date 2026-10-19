import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { MovieDto, MovieWatchResultDto, UpdateSynopsisRequestDto } from '@ceviu/shared';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { LEGACY_MESSAGES } from '../legacy-messages';
import { MediaKind } from '../media/media-kind';
import { caminhoImagemFilme, formatNumber, formatText } from '../../shared/utils/format';

/** Cliente HTTP do catalogo de filmes (`/movies`). */
@MediaKind({
  key: 'movies',
  navLabel: 'Filmes',
  pageTitle: 'Filmes e series',
  listTitle: 'Todos os Filmes',
  listEmptyMessage: 'Nenhum filme encontrado.',
  listErrorMessage: 'Falha ao carregar os filmes.',
  popularTitle: 'Filmes Populares',
  searchSectionLabel: 'Filmes',
  searchCountLabel: 'filmes',
  dialogTitlePrefix: 'Detalhes do Filme',
  dialogLoadError: 'Falha ao carregar o filme.',
  form: 'movie-synopsis',
  deleteOkMessage: LEGACY_MESSAGES.filmeRemovido,
  deleteErrorMessage: 'Falha ao remover Filme!',
  imagePath: caminhoImagemFilme,
  cardLines: (filme: MovieDto) => [
    `Ano: ${formatNumber(filme.year)}`,
    `Gênero: ${formatText(filme.genre)}`,
  ],
  searchLine: (filme: MovieDto) => [`(${formatNumber(filme.year)})`],
  detailLines: (filme: MovieDto) => [
    { rotulo: 'Ano', valor: formatNumber(filme.year) },
    { rotulo: 'Duração', valor: `${formatNumber(filme.durationMin)} minutos` },
    { rotulo: 'Gênero', valor: formatText(filme.genre) },
  ],
})
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
