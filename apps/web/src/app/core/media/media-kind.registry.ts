import { Injectable, InjectionToken, inject, type Type } from '@angular/core';
import { MoviesApiService } from '../api/movies-api.service';
import { SeriesApiService } from '../api/series-api.service';
import { mediaKind, type MediaApi, type MediaKindMetadata, type MediaResumo } from './media-kind';

/** Classe de servico de um tipo de midia. */
export type MediaKindApi = Type<MediaApi<MediaResumo>>;

/** Entrada do registry: a classe decorada + o descritor lido do store. */
export interface MediaKindEntry {
  readonly api: MediaKindApi;
  readonly metadados: MediaKindMetadata;
}

/**
 * Registry explicito dos tipos de midia (mesmo papel do `FORMS` da API):
 * tipo novo = 1 decorator `@MediaKind` no servico + 1 linha aqui.
 */
export const MEDIA_KINDS: readonly MediaKindApi[] = [MoviesApiService, SeriesApiService];

/** Permite registrar um tipo a mais em testes, sem tocar nas telas. */
export const MEDIA_KINDS_TOKEN = new InjectionToken<readonly MediaKindApi[]>('MEDIA_KINDS', {
  providedIn: 'root',
  factory: () => MEDIA_KINDS,
});

function entradaDeMidia(api: MediaKindApi): MediaKindEntry {
  const metadados = mediaKind(api);
  if (metadados === undefined) {
    throw new Error(`Classe ${api.name} registrada em MEDIA_KINDS sem o decorator @MediaKind.`);
  }
  return { api, metadados };
}

/** Acesso as entradas do registry para as telas genericas. */
@Injectable({ providedIn: 'root' })
export class MediaKindRegistry {
  private readonly classes = inject(MEDIA_KINDS_TOKEN);

  entradas(): readonly MediaKindEntry[] {
    return this.classes.map(entradaDeMidia);
  }

  porKey(key: string): MediaKindEntry | undefined {
    return this.entradas().find((entrada) => entrada.metadados.key === key);
  }
}
