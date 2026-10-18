import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../../core/api-config';
import { NoticeService } from '../../core/notices/notice.service';
import { HomeComponent } from './home.component';

/**
 * Descritor de `GET /api/metadata/search-catalog` com mensagens **diferentes**
 * das do legado de proposito: se a tela mostrar estas, a fonte e o servidor.
 */
const METADATA: FormMetadata = {
  fields: [],
  rules: [
    {
      kind: 'exactlyOneOf',
      properties: ['title', 'id'],
      missingMessage: 'Escolha um filtro de pesquisa',
      multipleMessage: 'Use apenas um filtro de pesquisa',
    },
  ],
};

const METADATA_URL = `${API_BASE_URL}/metadata/search-catalog`;

describe('HomeComponent', () => {
  let httpMock: HttpTestingController;
  let noticeMock: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    noticeMock = { info: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NoticeService, useValue: noticeMock },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function abrirHome(comMetadados = true): void {
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/movies`).flush([]);
    httpMock.expectOne(`${API_BASE_URL}/series`).flush([]);
    if (comMetadados) {
      httpMock.expectOne(METADATA_URL).flush(METADATA);
    }
    fixture.detectChanges();
  }

  function preencher(seletor: string, valor: string): void {
    const campo = fixture.nativeElement.querySelector(seletor) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function pesquisar(valores: { title?: string; id?: string }): void {
    if (valores.title !== undefined) {
      preencher('#pesquisa-nome', valores.title);
    }
    if (valores.id !== undefined) {
      preencher('#pesquisa-id', valores.id);
    }
    fixture.detectChanges();
    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('pesquisa vazia mostra a mensagem da regra do servidor e nao navega', () => {
    abrirHome();

    pesquisar({});

    expect(noticeMock.error).toHaveBeenCalledWith('Escolha um filtro de pesquisa');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('dois campos preenchidos mostram a mensagem de multiplos da regra e nao navegam', () => {
    abrirHome();

    pesquisar({ title: 'matrix', id: '21' });

    expect(noticeMock.error).toHaveBeenCalledWith('Use apenas um filtro de pesquisa');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('apenas o titulo navega com o query param da regra', () => {
    abrirHome();

    pesquisar({ title: 'matrix' });

    expect(noticeMock.error).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/search'], { queryParams: { title: 'matrix' } });
  });

  it('apenas o id navega com o query param da regra', () => {
    abrirHome();

    pesquisar({ id: '21' });

    expect(router.navigate).toHaveBeenCalledWith(['/search'], { queryParams: { id: '21' } });
  });

  it('sem o descritor carregado a busca nao decide nem avisa', () => {
    abrirHome(false);

    pesquisar({ title: 'matrix' });

    expect(noticeMock.error).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    httpMock.expectOne(METADATA_URL).flush(METADATA);
  });
});
