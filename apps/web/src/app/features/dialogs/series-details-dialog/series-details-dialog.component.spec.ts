import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../../../core/api-config';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';
import { SeriesDetailsDialogComponent } from './series-details-dialog.component';

/** Rotulo diferente do legado de proposito: se aparecer, a fonte e o servidor. */
const METADATA: FormMetadata = {
  fields: [
    { name: 'synopsis', label: 'Sinopse (API)', control: 'textarea', order: 1, required: true },
  ],
  rules: [],
};

const SERIE = {
  id: 7,
  title: 'Dark',
  year: 2017,
  durationMin: 60,
  genre: 'Mistério',
  synopsis: 'Antiga',
};

const METADATA_URL = `${API_BASE_URL}/metadata/series-synopsis`;
const SERIE_URL = `${API_BASE_URL}/series/7`;

describe('SeriesDetailsDialogComponent', () => {
  let httpMock: HttpTestingController;
  let noticeMock: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<SeriesDetailsDialogComponent>;

  beforeEach(async () => {
    noticeMock = { info: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SeriesDetailsDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { seriesId: 7 } },
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
    fixture = TestBed.createComponent(SeriesDetailsDialogComponent);
    fixture.detectChanges();
    httpMock.expectOne(SERIE_URL).flush(SERIE);
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

  it('usa o rotulo do descritor e preenche a sinopse da serie', async () => {
    await abrirDialogo();

    const rotulo = fixture.nativeElement.querySelector('.detalhe__rotulo') as HTMLElement;
    expect(rotulo.textContent?.trim()).toBe('Sinopse (API):');
    expect(textarea().value).toBe('Antiga');
  });

  it('salvar envia a sinopse editada e recarrega a serie', async () => {
    await abrirDialogo();

    preencherSinopse('Nova sinopse');
    botao('Salvar').click();
    fixture.detectChanges();

    const requisicao = httpMock.expectOne(SERIE_URL);
    expect(requisicao.request.method).toBe('PATCH');
    expect(requisicao.request.body).toEqual({ synopsis: 'Nova sinopse' });

    requisicao.flush({ ...SERIE, synopsis: 'Nova sinopse' });
    expect(noticeMock.info).toHaveBeenCalledWith(LEGACY_MESSAGES.sinopseAlterada);

    // reload() do recurso: o GET recarrega e precisa ser atendido antes do whenStable.
    fixture.detectChanges();
    httpMock.expectOne(SERIE_URL).flush({ ...SERIE, synopsis: 'Nova sinopse' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(textarea().value).toBe('Nova sinopse');
  });

  it('sem o descritor o salvar nao envia nada', async () => {
    await abrirDialogo(false);

    expect(fixture.nativeElement.querySelector('.detalhe__sinopse')).toBeNull();

    botao('Salvar').click();
    fixture.detectChanges();

    expect(httpMock.match(SERIE_URL).filter((req) => req.request.method === 'PATCH')).toHaveLength(0);

    httpMock.expectOne(METADATA_URL).flush(METADATA);
  });
});
