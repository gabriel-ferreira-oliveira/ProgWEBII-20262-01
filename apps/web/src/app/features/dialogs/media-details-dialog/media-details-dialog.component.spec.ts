import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../../../core/api-config';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';
import { MediaDetailsDialogComponent } from './media-details-dialog.component';

/** Rotulo diferente do legado de proposito: se aparecer, a fonte e o servidor. */
const METADATA: FormMetadata = {
  fields: [
    { name: 'synopsis', label: 'Sinopse (API)', control: 'textarea', order: 1, required: true },
  ],
  rules: [],
};

/**
 * Mesmos cenarios dos spec antigos de filme/serie: o mesmo componente generico
 * agora cobre os dois tipos so trocando o descritor do registry.
 */
const CASOS = [
  {
    kind: 'movies',
    tituloEsperado: 'Detalhes do Filme - Matrix',
    linhasEsperadas: ['Ano: 1999', 'Duração: 136 minutos', 'Gênero: Ação'],
    remocao: LEGACY_MESSAGES.filmeRemovido,
    item: { id: 7, title: 'Matrix', year: 1999, durationMin: 136, genre: 'Ação', synopsis: 'Antiga' },
    itemUrl: `${API_BASE_URL}/movies/7`,
    metadataUrl: `${API_BASE_URL}/metadata/movie-synopsis`,
  },
  {
    kind: 'series',
    tituloEsperado: 'Detalhes da Serie - Dark',
    linhasEsperadas: ['Ano: 2017', 'Duração: 60 minutos', 'Gênero: Mistério'],
    remocao: LEGACY_MESSAGES.serieRemovida,
    item: { id: 7, title: 'Dark', year: 2017, durationMin: 60, genre: 'Mistério', synopsis: 'Antiga' },
    itemUrl: `${API_BASE_URL}/series/7`,
    metadataUrl: `${API_BASE_URL}/metadata/series-synopsis`,
  },
];

for (const caso of CASOS) {
  describe(`MediaDetailsDialogComponent (${caso.kind})`, () => {
    let httpMock: HttpTestingController;
    let noticeMock: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
    let dialogRefMock: { close: ReturnType<typeof vi.fn> };
    let fixture: ComponentFixture<MediaDetailsDialogComponent>;

    beforeEach(async () => {
      noticeMock = { info: vi.fn(), error: vi.fn() };
      dialogRefMock = { close: vi.fn() };
      await TestBed.configureTestingModule({
        imports: [MediaDetailsDialogComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: MAT_DIALOG_DATA, useValue: { kind: caso.kind, id: caso.item.id } },
          { provide: MatDialogRef, useValue: dialogRefMock },
          { provide: NoticeService, useValue: noticeMock },
        ],
      }).compileComponents();
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    async function abrirDialogo(comMetadados = true): Promise<void> {
      fixture = TestBed.createComponent(MediaDetailsDialogComponent);
      fixture.detectChanges();
      httpMock.expectOne(caso.itemUrl).flush(caso.item);
      if (comMetadados) {
        httpMock.expectOne(caso.metadataUrl).flush(METADATA);
      }
      await fixture.whenStable();
      fixture.detectChanges();
    }

    function textarea(): HTMLTextAreaElement {
      const campo = fixture.nativeElement.querySelector('.detalhe__sinopse') as HTMLTextAreaElement | null;
      if (campo === null) {
        throw new Error('textarea da sinopse nao encontrada');
      }
      return campo;
    }

    function preencherSinopse(valor: string): void {
      const campo = textarea();
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function botao(texto: string): HTMLButtonElement {
      const encontrado = [...(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)].find(
        (candidato) => candidato.textContent?.includes(texto),
      );
      if (encontrado === undefined) {
        throw new Error(`botao "${texto}" nao encontrado`);
      }
      return encontrado;
    }

    it('usa o rotulo do descritor e preenche a sinopse do item', async () => {
      await abrirDialogo();

      const rotulo = fixture.nativeElement.querySelector('.detalhe__rotulo') as HTMLElement;
      expect(rotulo.textContent?.trim()).toBe('Sinopse (API):');
      expect(textarea().value).toBe('Antiga');
    });

    it('titulo e linhas de detalhe vem do descritor do tipo', async () => {
      await abrirDialogo();

      const titulo = fixture.nativeElement.querySelector('.detalhe-titulo') as HTMLElement;
      expect(titulo.textContent?.trim()).toBe(caso.tituloEsperado);

      const linhas = [...(fixture.nativeElement.querySelectorAll('.detalhe__linha') as NodeListOf<HTMLElement>)];
      expect(linhas.map((linha) => linha.textContent?.trim())).toEqual(caso.linhasEsperadas);
    });

    it('salvar envia a sinopse editada e recarrega o item', async () => {
      await abrirDialogo();

      preencherSinopse('Nova sinopse');
      botao('Salvar').click();
      fixture.detectChanges();

      const requisicao = httpMock.expectOne(caso.itemUrl);
      expect(requisicao.request.method).toBe('PATCH');
      expect(requisicao.request.body).toEqual({ synopsis: 'Nova sinopse' });

      requisicao.flush({ ...caso.item, synopsis: 'Nova sinopse' });
      expect(noticeMock.info).toHaveBeenCalledWith(LEGACY_MESSAGES.sinopseAlterada);

      // reload() do recurso: o GET recarrega e precisa ser atendido antes do whenStable.
      fixture.detectChanges();
      httpMock.expectOne(caso.itemUrl).flush({ ...caso.item, synopsis: 'Nova sinopse' });
      await fixture.whenStable();
      fixture.detectChanges();
      expect(textarea().value).toBe('Nova sinopse');
    });

    it('deletar avisa com a mensagem do tipo e fecha com { deleted: true }', async () => {
      await abrirDialogo();

      botao('Deletar').click();
      fixture.detectChanges();

      const requisicao = httpMock.expectOne(caso.itemUrl);
      expect(requisicao.request.method).toBe('DELETE');
      requisicao.flush(null);

      expect(noticeMock.info).toHaveBeenCalledWith(caso.remocao);
      expect(dialogRefMock.close).toHaveBeenCalledWith({ deleted: true });
    });

    it('sem o descritor o salvar nao envia nada', async () => {
      await abrirDialogo(false);

      expect(fixture.nativeElement.querySelector('.detalhe__sinopse')).toBeNull();

      botao('Salvar').click();
      fixture.detectChanges();

      expect(httpMock.match(caso.itemUrl).filter((req) => req.request.method === 'PATCH')).toHaveLength(0);

      httpMock.expectOne(caso.metadataUrl).flush(METADATA);
    });
  });
}
