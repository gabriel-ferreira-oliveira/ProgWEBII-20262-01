import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { of, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { MediaDetailsDialogComponent } from '../dialogs/media-details-dialog/media-details-dialog.component';
import type { MediaDetailsDialogResult } from '../dialogs/media-details-dialog/media-details-dialog.component';
import { MediaListComponent } from './media-list.component';

/** Mesmos cenarios das telas FrameFilmes/FrameSerie, cobertos por um componente so. */
const CASOS = [
  {
    kind: 'movies',
    titulo: 'Todos os Filmes',
    vazio: 'Nenhum filme encontrado.',
    erro: 'Falha ao carregar os filmes.',
    url: `${API_BASE_URL}/movies`,
    item: { id: 7, title: 'Matrix', year: 1999, durationMin: 136, genre: 'Ação', synopsis: 'Antiga' },
    linhas: ['Ano: 1999', 'Gênero: Ação'],
  },
  {
    kind: 'series',
    titulo: 'Todas as Séries',
    vazio: 'Nenhuma serie encontrada.',
    erro: 'Falha ao carregar as series.',
    url: `${API_BASE_URL}/series`,
    item: {
      id: 7,
      title: 'Dark',
      year: 2017,
      durationMin: 60,
      genre: 'Mistério',
      synopsis: 'Antiga',
      episodes: 26,
      season: 3,
    },
    linhas: ['Ano: 2017', 'Gênero: Mistério'],
  },
];

for (const caso of CASOS) {
  describe(`MediaListComponent (${caso.kind})`, () => {
    let httpMock: HttpTestingController;
    let dialogMock: { open: ReturnType<typeof vi.fn> };
    let afterClosed: Observable<MediaDetailsDialogResult | undefined>;
    let router: Router;
    let fixture: ComponentFixture<MediaListComponent>;

    beforeEach(async () => {
      afterClosed = of(undefined);
      dialogMock = { open: vi.fn(() => ({ afterClosed: () => afterClosed })) };
      await TestBed.configureTestingModule({
        imports: [MediaListComponent],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          { provide: MatDialog, useValue: dialogMock },
        ],
      }).compileComponents();
      httpMock = TestBed.inject(HttpTestingController);
      router = TestBed.inject(Router);
      vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    afterEach(() => {
      httpMock.verify();
    });

    async function abrirLista(itens: readonly object[] = [caso.item]): Promise<void> {
      fixture = TestBed.createComponent(MediaListComponent);
      fixture.componentRef.setInput('kind', caso.kind);
      fixture.detectChanges();
      httpMock.expectOne(caso.url).flush(itens);
      await fixture.whenStable();
      fixture.detectChanges();
    }

    function textos(seletor: string): readonly (string | undefined)[] {
      return [...(fixture.nativeElement.querySelectorAll(seletor) as NodeListOf<HTMLElement>)].map(
        (elemento) => elemento.textContent?.trim(),
      );
    }

    function botaoRetry(): HTMLButtonElement {
      const caixaErro = fixture.nativeElement.querySelector('.erro-carregamento') as HTMLElement;
      const botao = [...(caixaErro.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)]?.find(
        (candidato) => candidato.textContent?.includes('Tentar novamente'),
      );
      if (botao === undefined) {
        throw new Error('botao "Tentar novamente" nao encontrado');
      }
      return botao;
    }

    it('titulo e cards vem do descritor do tipo', async () => {
      await abrirLista();

      const titulo = fixture.nativeElement.querySelector('.titulo-pagina') as HTMLElement;
      expect(titulo.textContent?.trim()).toBe(caso.titulo);
      expect(textos('.card-ceviu__titulo')).toEqual([caso.item.title]);
      expect(textos('.card-ceviu__linha')).toEqual(caso.linhas);
    });

    it('lista vazia usa a mensagem do descritor', async () => {
      await abrirLista([]);

      const vazio = fixture.nativeElement.querySelector('.texto-vazio') as HTMLElement;
      expect(vazio.textContent?.trim()).toBe(caso.vazio);
    });

    it('erro mostra a mensagem do descritor e "Tentar novamente" recarrega', async () => {
      fixture = TestBed.createComponent(MediaListComponent);
      fixture.componentRef.setInput('kind', caso.kind);
      fixture.detectChanges();
      httpMock.expectOne(caso.url).flush(null, { status: 500, statusText: 'Erro' });
      await fixture.whenStable();
      fixture.detectChanges();

      const caixaErro = fixture.nativeElement.querySelector('.erro-carregamento') as HTMLElement;
      expect(caixaErro.textContent).toContain(caso.erro);

      botaoRetry().click();
      fixture.detectChanges();
      httpMock.expectOne(caso.url).flush([caso.item]);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(textos('.card-ceviu__titulo')).toEqual([caso.item.title]);
    });

    it('clicar no card abre o dialogo generico com o kind da rota e recarrega ao fechar', async () => {
      await abrirLista();

      const card = fixture.nativeElement.querySelector('.card-ceviu') as HTMLButtonElement;
      card.click();
      fixture.detectChanges();

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
      const [componente, config] = dialogMock.open.mock.calls[0] as [
        unknown,
        { data: { kind: string; id: number } },
      ];
      expect(componente).toBe(MediaDetailsDialogComponent);
      expect(config.data).toEqual({ kind: caso.kind, id: caso.item.id });

      // Fechar sem remover recarrega a lista (paridade com o legado).
      httpMock.expectOne(caso.url).flush([caso.item]);
      await fixture.whenStable();
    });

    it('remocao fecha o dialogo com { deleted: true } e volta para a home', async () => {
      afterClosed = of({ deleted: true });
      await abrirLista();

      const card = fixture.nativeElement.querySelector('.card-ceviu') as HTMLButtonElement;
      card.click();
      fixture.detectChanges();

      expect(router.navigate).toHaveBeenCalledWith(['/home']);
    });
  });
}
