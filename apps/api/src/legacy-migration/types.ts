export type LegacySource = 'Filmes.txt' | 'Series.txt' | 'Usuarios.txt' | 'Perfil.txt';

export interface LegacyRejection {
  readonly source: LegacySource;
  readonly lineNumber: number;
  readonly raw: string;
  readonly reason: string;
}

export interface ParsedMovie {
  readonly id: number;
  readonly title: string;
  readonly genre: string | null;
  readonly synopsis: string | null;
  readonly year: number | null;
  readonly durationMin: number | null;
}

export interface ParsedSeries {
  readonly id: number;
  readonly title: string;
  readonly genre: string | null;
  readonly synopsis: string | null;
  readonly year: number | null;
  readonly durationMin: number | null;
  readonly episodes: number | null;
}

export interface ParsedCredential {
  readonly email: string;
  readonly password: string;
  readonly lineNumber: number;
}

export interface ParsedProfile {
  readonly email: string;
  readonly startLine: number;
  readonly infoEmail: string | null;
  readonly name: string | null;
  readonly country: string | null;
  readonly age: number | null;
  readonly bio: string | null;
  readonly watchedMovies: readonly string[];
  readonly watchedSeries: readonly string[];
  readonly favorites: readonly string[];
  readonly timeMovie: number;
  readonly timeSeries: number;
  readonly timeTotal: number;
}

export interface LegacyParseResult {
  readonly movies: readonly ParsedMovie[];
  readonly series: readonly ParsedSeries[];
  readonly credentials: readonly ParsedCredential[];
  readonly profiles: readonly ParsedProfile[];
  readonly rejections: readonly LegacyRejection[];
}
