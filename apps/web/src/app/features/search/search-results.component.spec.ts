import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Router, provideRouter } from '@angular/router';
import { of, type Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/api-config';
import { LEGACY_MESSAGES } from '../../core/legacy-messages';
import { MediaDetailsDialogComponent } from '../dialogs/media-details-dialog/media-details-dialog.component';
import type { MediaDetailsDialogResult } from '../dialogs/media-details-dialog/media-details-dialog.component';
import { SearchResultsComponent } from './search-results.component';

const FILME = { id: 7, title: 'Matrix', year: 1999, durationMin: 136, genre: 'Ação', synopsis: 'Antiga' };
const SERIE = {
  id: 9,
  title: 'Dark',
  year: 2017,
  durationMin: 60,
  genre: 'Mistério',
  synopsis: 'Antiga',
  episodes: 26,
  season: 3,
};

const BUSCA_URL = `${API_BASE_URL}/search?title=matrix`;
const RESULTADO = { movies: [FILME], series: [SERIE] };

describe('SearchResultsComponent', () => {
  let httpMock: HttpTestingController;
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let afterClosed: Observable<MediaDetailsDialogResult | undefined>;
  let router: Router;
  let fixture: ComponentFixture<SearchResultsComponent>;

  beforeEach(async () => {
    afterClosed = of(undefined);
    dialogMock = { open: vi.fn(() => ({ afterClosed: () => afterClosed })) };
    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
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

  async function abrirBusca(resultado: object = RESULTADO): Promise<void> {
    fixture = TestBed.createComponent(SearchResultsComponent);
    fixture.componentRef.setInput('title', 'matrix');
    fixture.detectChanges();
    httpMock.expectOne(BUSCA_URL).flush(resultado);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function textos(seletor: string): readonly (string | undefined)[] {
    return [...(fixture.nativeElement.querySelectorAll(seletor) as NodeListOf<HTMLElement>)].map(
      (elemento) => elemento.textContent?.trim(),
    );
  }

  it('secoes e contagens vem do registry com os rotulos do legado', async () => {
    await abrirBusca();

    const titulo = fixture.nativeElement.querySelector('.resultados__titulo') as HTMLElement;
    expect(titulo.textContent?.trim()).toBe('Resultados da Pesquisa (1 filmes, 1 séries)');
    expect(textos('.titulo-secao')).toEqual(['Filmes (1)', 'Séries (1)']);
    expect(textos('.card-ceviu__titulo')).toEqual(['Matrix', 'Dark']);
    expect(textos('.card-ceviu__linha')).toEqual(['(1999)', '(2017 - 3 temp.)']);
    expect(textos('.card-ceviu__acao')).toEqual(['Ver Detalhes', 'Ver Detalhes']);
  });

  it('resultado vazio mostra a mensagem de resultado vazio do legado', async () => {
    await abrirBusca({ movies: [], series: [] });

    const vazio = fixture.nativeElement.querySelector('.resultados__vazio') as HTMLElement;
    expect(vazio.textContent?.trim()).toBe(LEGACY_MESSAGES.resultadoVazio);
    expect(textos('.titulo-secao')).toEqual([]);
  });

  it('erro mostra "Tentar novamente" e recarrega a busca', async () => {
    fixture = TestBed.createComponent(SearchResultsComponent);
    fixture.componentRef.setInput('title', 'matrix');
    fixture.detectChanges();
    httpMock.expectOne(BUSCA_URL).flush(null, { status: 404, statusText: 'Nao encontrado' });
    await fixture.whenStable();
    fixture.detectChanges();

    const caixaErro = fixture.nativeElement.querySelector('.erro-carregamento') as HTMLElement;
    const botao = [...(caixaErro.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)].find(
      (candidato) => candidato.textContent?.includes('Tentar novamente'),
    );
    if (botao === undefined) {
      throw new Error('botao "Tentar novamente" nao encontrado');
    }

    botao.click();
    fixture.detectChanges();
    httpMock.expectOne(BUSCA_URL).flush(RESULTADO);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textos('.card-ceviu__titulo')).toEqual(['Matrix', 'Dark']);
  });

  it('"Ver Detalhes" abre o dialogo generico com o kind do registry e recarrega ao fechar', async () => {
    await abrirBusca();

    const botoes = [
      ...(fixture.nativeElement.querySelectorAll('.card-ceviu__acao') as NodeListOf<HTMLButtonElement>),
    ];
    botoes[0].click();
    fixture.detectChanges();

    const [componente, config] = dialogMock.open.mock.calls[0] as [
      unknown,
      { data: { kind: string; id: number } },
    ];
    expect(componente).toBe(MediaDetailsDialogComponent);
    expect(config.data).toEqual({ kind: 'movies', id: FILME.id });

    // Fechar sem remover recarrega a busca (paridade com o legado).
    httpMock.expectOne(BUSCA_URL).flush(RESULTADO);
    await fixture.whenStable();
  });

  it('remocao fecha com { deleted: true } e volta para a home', async () => {
    afterClosed = of({ deleted: true });
    await abrirBusca();

    const botao = fixture.nativeElement.querySelector('.card-ceviu__acao') as HTMLButtonElement;
    botao.click();
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });
});
