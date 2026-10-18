import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../../../core/api-config';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';
import { RegisterComponent } from './register.component';

/** Descritor real de `GET /api/metadata/register` (e2e da T3.4/T3.5, ordem de UI). */
const METADATA: FormMetadata = {
  fields: [
    { name: 'name', label: 'Nome', control: 'text', order: 1, required: true },
    { name: 'email', label: 'Email', control: 'text', order: 2, required: true },
    { name: 'age', label: 'Idade', control: 'number', order: 3, required: true, min: 0 },
    { name: 'password', label: 'Senha', control: 'password', order: 4, required: true },
    { name: 'bio', label: 'Sobre', control: 'textarea', order: 5, required: false },
  ],
  rules: [],
};

const METADATA_URL = `${API_BASE_URL}/metadata/register`;
const REGISTER_URL = `${API_BASE_URL}/auth/register`;

describe('RegisterComponent', () => {
  let httpMock: HttpTestingController;
  let noticeMock: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    noticeMock = { info: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
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
    fixture = TestBed.createComponent(RegisterComponent);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function abrirCadastro(): void {
    fixture.detectChanges();
    httpMock.expectOne(METADATA_URL).flush(METADATA);
    fixture.detectChanges();
  }

  function elemento(seletor: string): HTMLInputElement | HTMLTextAreaElement {
    const encontrado = fixture.nativeElement.querySelector(seletor) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (encontrado === null) {
      throw new Error(`elemento "${seletor}" nao encontrado`);
    }
    return encontrado;
  }

  function preencher(seletor: string, valor: string): void {
    const controle = elemento(seletor);
    controle.value = valor;
    controle.dispatchEvent(new Event('input'));
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

  it('busca o descritor e monta os campos na ordem da UI', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();

    httpMock.expectOne(METADATA_URL).flush(METADATA);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeNull();
    const rotulos = [...(fixture.nativeElement.querySelectorAll('.campo-rotulo') as NodeListOf<HTMLElement>)].map(
      (rotulo) => rotulo.textContent?.trim(),
    );
    expect(rotulos).toEqual(['Nome:', 'Email:', 'Idade:', 'Senha:', 'Sobre:']);

    const idade = elemento('#cadastro-age');
    expect(idade.getAttribute('type')).toBe('text');
    expect(idade.getAttribute('inputmode')).toBe('numeric');

    const senha = elemento('#cadastro-password');
    expect(senha.getAttribute('type')).toBe('password');
    expect(senha.getAttribute('autocomplete')).toBe('new-password');

    expect(elemento('#cadastro-bio').tagName).toBe('TEXTAREA');
  });

  it('erro ao buscar o descritor mostra a mensagem da API e o retry recarrega', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(METADATA_URL)
      .flush({ message: 'Formulario register nao encontrado' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Formulario register nao encontrado');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    botao('Tentar novamente').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();

    httpMock.expectOne(METADATA_URL).flush(METADATA);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });

  it('cadastrar envia o payload do contrato (idade convertida por control number)', () => {
    abrirCadastro();

    preencher('#cadastro-name', 'Gabriel');
    preencher('#cadastro-email', 'gabriel@exemplo.com');
    preencher('#cadastro-age', '21');
    preencher('#cadastro-password', 'segredo');

    botao('Cadastrar').click();
    fixture.detectChanges();

    const requisicao = httpMock.expectOne(REGISTER_URL);
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({
      name: 'Gabriel',
      email: 'gabriel@exemplo.com',
      age: 21,
      password: 'segredo',
      bio: '',
    });

    requisicao.flush({});
    fixture.detectChanges();

    expect(noticeMock.info).toHaveBeenCalledWith(LEGACY_MESSAGES.cadastroOk);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('formulario invalido (idade vazia exige required do descritor) nao chama a API', () => {
    abrirCadastro();

    preencher('#cadastro-name', 'Gabriel');
    preencher('#cadastro-email', 'gabriel@exemplo.com');
    preencher('#cadastro-password', 'segredo');

    botao('Cadastrar').click();
    fixture.detectChanges();

    expect(noticeMock.error).toHaveBeenCalledWith(LEGACY_MESSAGES.cadastroInvalido);
    httpMock.expectNone(REGISTER_URL);
  });

  it('limpar campos zera os controles', () => {
    abrirCadastro();

    preencher('#cadastro-name', 'Gabriel');
    fixture.detectChanges();
    expect(elemento('#cadastro-name').value).toBe('Gabriel');

    botao('Limpar Campos').click();
    fixture.detectChanges();
    expect(elemento('#cadastro-name').value).toBe('');
  });
});
