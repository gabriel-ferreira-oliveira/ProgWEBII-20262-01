import type { UpdateSynopsisRequestDto } from '@ceviu/shared';
import type { Observable } from 'rxjs';
import { defineMetadata, getMetadata } from '../reflection/class-metadata';

/** Campos exibidos nas telas genericas, comuns a todos os tipos de midia. */
export interface MediaResumo {
  readonly id: number;
  readonly title: string;
  readonly genre: string | null;
  readonly synopsis: string | null;
  readonly year: number | null;
  readonly durationMin: number | null;
}

/** Contrato minimo dos servicos de midia (MoviesApiService, SeriesApiService). */
export interface MediaApi<TDto extends MediaResumo> {
  list(): Observable<TDto[]>;
  get(id: number): Observable<TDto>;
  updateSynopsis(id: number, payload: UpdateSynopsisRequestDto): Observable<TDto>;
  remove(id: number): Observable<void>;
  watch(id: number): Observable<unknown>;
  favorite(id: number): Observable<unknown>;
}

/** Linha "Rotulo: valor" do modal de detalhes. */
export interface DetalheMidia {
  readonly rotulo: string;
  readonly valor: string;
}

/**
 * Descritor de um tipo de midia (filme, serie, novela...): tudo que as telas
 * genericas precisam saber, com as strings do legado preservadas.
 */
export interface MediaKindMetadata<TDto extends MediaResumo = MediaResumo> {
  /** Segmento da rota `/media/:kind` e chave do registry. */
  readonly key: string;
  /** Rotulo do menu lateral (texto do legado). */
  readonly navLabel: string;
  /** Titulo da janela/documento. */
  readonly pageTitle: string;
  readonly listTitle: string;
  readonly listEmptyMessage: string;
  readonly listErrorMessage: string;
  readonly popularTitle: string;
  readonly searchSectionLabel: string;
  readonly searchCountLabel: string;
  readonly dialogTitlePrefix: string;
  readonly dialogLoadError: string;
  /** Formulario publicado pela API (`GET /api/metadata/:form`). */
  readonly form: string;
  readonly deleteOkMessage: string;
  readonly deleteErrorMessage: string;
  readonly imagePath: (id: number) => string;
  readonly cardLines: (dto: TDto) => readonly string[];
  readonly searchLine: (dto: TDto) => readonly string[];
  readonly detailLines: (dto: TDto) => readonly DetalheMidia[];
}

/** Chave do store de reflexao (mesmo prefixo `ceviu:` da API). */
export const CHAVE_MEDIA_KIND = 'ceviu:media:kind';

/**
 * Decorator de classe no estilo `@Entity`/`@Field` da API: grava o descritor
 * no store de metadados; o registry o le em runtime sem conhecer os tipos.
 */
export function MediaKind<TDto extends MediaResumo>(
  metadata: MediaKindMetadata<TDto>,
): ClassDecorator {
  return (target) => {
    defineMetadata(target, CHAVE_MEDIA_KIND, metadata);
  };
}

/** Le o descritor gravado por `@MediaKind`; `undefined` para classe sem o decorator. */
export function mediaKind(target: object): MediaKindMetadata | undefined {
  const metadados = getMetadata(target, CHAVE_MEDIA_KIND);
  return metadados === undefined ? undefined : (metadados as MediaKindMetadata);
}
