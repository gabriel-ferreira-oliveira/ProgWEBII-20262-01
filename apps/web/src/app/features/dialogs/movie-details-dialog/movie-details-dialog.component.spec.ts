import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../../../core/api-config';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';
import { MovieDetailsDialogComponent } from './movie-details-dialog.component';

/** Rotulo diferente do legado de proposito: se aparecer, a fonte e o servidor. */
const METADATA: FormMetadata = {
  fields: [
    { name: 'synopsis', label: 'Sinopse (API)', control: 'textarea', order: 1, required: true },
  ],
  rules: [],
};

const FILME = {
  id: 7,
  title: 'Matrix',
  year: 1999,
  durationMin: 136,
  genre: 'Ação',
  synopsis: 'Antiga',
};

const METADATA_URL = `${API_BASE_URL}/metadata/movie-synopsis`;
const FILME_URL = `${API_BASE_URL}/movies/7`;

describe('MovieDetailsDialogComponent', () => {
  let httpMock: HttpTestingController;
  let noticeMock: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<MovieDetailsDialogComponent>;

  beforeEach(async () => {
    noticeMock = { info: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [MovieDetailsDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { movieId: 7 } },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: NoticeService, useValue: noticeMock },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function abrirDialogo(comMetadados = true): Promise<void> {
    fixture = TestBed.createComponent(MovieDetailsDialogComponent);
    fixture.detectChanges();
    httpMock.expectOne(FILME_URL).flush(FILME);
    if (comMetadados) {
      httpMock.expectOne(METADATA_URL).flush(METADATA);
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

  it('usa o rotulo do descritor e preenche a sinopse do filme', async () => {
    await abrirDialogo();

    const rotulo = fixture.nativeElement.querySelector('.detalhe__rotulo') as HTMLElement;
    expect(rotulo.textContent?.trim()).toBe('Sinopse (API):');
    expect(textarea().value).toBe('Antiga');
  });

  it('salvar envia a sinopse editada e recarrega o filme', async () => {
    await abrirDialogo();

    preencherSinopse('Nova sinopse');
    botao('Salvar').click();
    fixture.detectChanges();

    const requisicao = httpMock.expectOne(FILME_URL);
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ synopsis: 'Nova sinopse' });

    requisicao.flush({ ...FILME, synopsis: 'Nova sinopse' });
    expect(noticeMock.info).toHaveBeenCalledWith(LEGACY_MESSAGES.sinopseAlterada);

    // reload() do recurso: o GET recarrega e precisa ser atendido antes do whenStable
    // (recursos pendentes seguram a estabilidade do fixture).
    fixture.detectChanges();
    httpMock.expectOne(FILME_URL).flush({ ...FILME, synopsis: 'Nova sinopse' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textarea().value).toBe('Nova sinopse');
  });

  it('sem o descritor o salvar nao envia nada', async () => {
    await abrirDialogo(false);

    expect(fixture.nativeElement.querySelector('.detalhe__sinopse')).toBeNull();

    botao('Salvar').click();
    fixture.detectChanges();

    expect(httpMock.match(FILME_URL).filter((req) => req.request.method === 'PATCH')).toHaveLength(0);

    httpMock.expectOne(METADATA_URL).flush(METADATA);
  });
});
