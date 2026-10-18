export interface MovieDto {
  readonly id: number;
  readonly title: string;
  readonly genre: string | null;
  readonly synopsis: string | null;
  readonly year: number | null;
  readonly durationMin: number | null;
}

export interface SeriesDto {
  readonly id: number;
  readonly title: string;
  readonly genre: string | null;
  readonly synopsis: string | null;
  readonly year: number | null;
  readonly durationMin: number | null;
  readonly episodes: number | null;
  readonly season: number;
}

/** Dados exibidos no card da lista de perfis (nome + idade). */
export interface UserSummaryDto {
  readonly id: number;
  readonly name: string;
  readonly age: number | null;
}

/** Perfil completo (tela de detalhes do usuário). */
export interface UserProfileDto {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly country: string | null;
  readonly age: number | null;
  readonly bio: string | null;
}

export interface UserTimesDto {
  readonly watchedMovieMinutes: number;
  readonly watchedSeriesMinutes: number;
  readonly totalMinutes: number;
}

/** Item de histórico (filmes/séries assistidas) preservando ordem e duplicatas. */
export interface WatchedEntryDto {
  readonly title: string;
  readonly position: number;
  readonly movieId: number | null;
  readonly seriesId: number | null;
}

export interface FavoriteEntryDto {
  readonly title: string;
  readonly mediaType: string;
  readonly position: number;
  readonly movieId: number | null;
  readonly seriesId: number | null;
}

export interface SearchResultDto {
  readonly movies: MovieDto[];
  readonly series: SeriesDto[];
}

export interface LoginResponseDto {
  readonly token: string;
  readonly user: UserProfileDto;
}

/** Resposta de `POST /movies/:id/watch` e `POST /movies/:id/favorite`. */
export interface MovieWatchResultDto {
  readonly watchedMovieMinutes: number;
}

/** Resposta de `POST /series/:id/watch` e `POST /series/:id/favorite`. */
export interface SeriesWatchResultDto {
  readonly watchedSeriesMinutes: number;
}

/** Resposta de `GET /users/:id` (perfil + tempos assistidos). */
export interface UserDetailDto {
  readonly profile: UserProfileDto;
  readonly times: UserTimesDto;
}

/** Corpo de `POST /auth/login`. */
export interface LoginRequestDto {
  readonly email: string;
  readonly password: string;
}

/**
 * Corpo de `POST /auth/register`.
 * Paridade com o legado: a tela exige idade (Integer.parseInt) e o backend tambem (T3.5);
 * `bio` continua opcional.
 */
export interface RegisterRequestDto {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly age: number;
  readonly bio?: string;
}

/** Corpo de `PATCH /movies/:id` e `PATCH /series/:id`. */
export interface UpdateSynopsisRequestDto {
  readonly synopsis: string;
}

/** Query de `GET /search` (exatamente um filtro). */
export interface SearchRequestDto {
  readonly title?: string;
  readonly id?: number;
}
