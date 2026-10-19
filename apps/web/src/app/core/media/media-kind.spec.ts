import { TestBed } from '@angular/core/testing';
import { MoviesApiService } from '../api/movies-api.service';
import { SeriesApiService } from '../api/series-api.service';
import { MediaKind, mediaKind, type MediaKindMetadata } from './media-kind';
import {
  MEDIA_KINDS,
  MEDIA_KINDS_TOKEN,
  MediaKindRegistry,
  type MediaKindApi,
} from './media-kind.registry';

/** Descritor minimo para classes fake dos testes. */
function descritor(key: string): MediaKindMetadata {
  return {
    key,
    navLabel: key,
    pageTitle: key,
    listTitle: key,
    listEmptyMessage: '',
    listErrorMessage: '',
    popularTitle: key,
    searchSectionLabel: key,
    searchCountLabel: key,
    dialogTitlePrefix: key,
    dialogLoadError: '',
    form: key,
    deleteOkMessage: '',
    deleteErrorMessage: '',
    imagePath: () => '',
    cardLines: () => [],
    searchLine: () => [],
    detailLines: () => [],
  };
}

/** Tipo fake so do teste: prova que um 3o tipo entra so pelo token do registry. */
@MediaKind(descritor('novelas'))
class MidiaFakeApi {}

describe('store de metadados', () => {
  it('le o descritor gravado pelo decorator @MediaKind', () => {
    expect(mediaKind(MidiaFakeApi)?.key).toBe('novelas');
  });

  it('retorna undefined para classe sem o decorator', () => {
    class SemMetadados {}

    expect(mediaKind(SemMetadados)).toBeUndefined();
  });
});

describe('MediaKindRegistry', () => {
  function registryCom(classes?: readonly MediaKindApi[]): MediaKindRegistry {
    TestBed.configureTestingModule({
      providers: classes === undefined ? [] : [{ provide: MEDIA_KINDS_TOKEN, useValue: classes }],
    });
    return TestBed.inject(MediaKindRegistry);
  }

  it('resolve os tipos de midia do projeto por key', () => {
    const registry = registryCom();

    expect(registry.entradas().map((entrada) => entrada.metadados.key)).toEqual(['movies', 'series']);
    expect(registry.porKey('movies')?.api).toBe(MoviesApiService);
    expect(registry.porKey('series')?.api).toBe(SeriesApiService);
  });

  it('retorna undefined para key desconhecida', () => {
    const registry = registryCom();

    expect(registry.porKey('novelas')).toBeUndefined();
  });

  it('aceita um tipo novo so pelo MEDIA_KINDS_TOKEN (sem tocar nas telas)', () => {
    const registry = registryCom([...MEDIA_KINDS, MidiaFakeApi as unknown as MediaKindApi]);

    expect(registry.porKey('novelas')?.api).toBe(MidiaFakeApi);
  });

  it('falha alto quando uma classe registrada nao tem o decorator', () => {
    class SemMetadados {}
    const registry = registryCom([SemMetadados as unknown as MediaKindApi]);

    expect(() => registry.entradas()).toThrow(/SemMetadados.*@MediaKind/);
  });
});
