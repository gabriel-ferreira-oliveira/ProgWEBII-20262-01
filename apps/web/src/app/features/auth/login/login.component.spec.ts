import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../../../core/api-config';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';
import { LoginComponent } from './login.component';

/** Descritor real de `GET /api/metadata/login` (login.dto.ts). */
const METADATA: FormMetadata = {
  fields: [
    { name: 'email', label: 'Email', control: 'text', order: 1, required: true },
    { name: 'password', label: 'Senha', control: 'password', order: 2, required: true },
  ],
  rules: [],
};

const METADATA_URL = `${API_BASE_URL}/metadata/login`;
const LOGIN_URL = `${API_BASE_URL}/auth/login`;

describe('LoginComponent', () => {
  let httpMock: HttpTestingController;
  let noticeMock: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let router: Router;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    noticeMock = { info: vi.fn(), error: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
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
    localStorage.clear();
    fixture = TestBed.createComponent(LoginComponent);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function abrirLogin(): void {
    fixture.detectChanges();
    httpMock.expectOne(METADATA_URL).flush(METADATA);
    fixture.detectChanges();
  }

  function elemento(seletor: string): HTMLInputElement {
    const encontrado = fixture.nativeElement.querySelector(seletor) as HTMLInputElement | null;
    if (encontrado === null) {
      throw new Error(`elemento "${seletor}" nao encontrado`);
    }
    return encontrado;
  }

  function preencher(seletor: string, valor: string): void {
    const campo = elemento(seletor);
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function entrar(valores: { email?: string; senha?: string }): void {
    if (valores.email !== undefined) {
      preencher('#login-email', valores.email);
    }
    if (valores.senha !== undefined) {
      preencher('#login-password', valores.senha);
    }
    fixture.detectChanges();
    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('busca o descritor e monta os campos na ordem da UI', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();

    httpMock.expectOne(METADATA_URL).flush(METADATA);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeNull();
    const rotulos = [...(fixture.nativeElement.querySelectorAll('.campo-icone__rotulo') as NodeListOf<HTMLElement>)].map(
      (rotulo) => rotulo.textContent?.trim(),
    );
    expect(rotulos).toEqual(['Email:', 'Senha:']);

    const email = elemento('#login-email');
    expect(email.getAttribute('type')).toBe('text');
    expect(email.getAttribute('autocomplete')).toBe('username');

    const senha = elemento('#login-password');
    expect(senha.getAttribute('type')).toBe('password');
    expect(senha.getAttribute('autocomplete')).toBe('current-password');
  });

  it('erro ao buscar o descritor mostra a mensagem da API e o retry recarrega', () => {
    fixture.detectChanges();
    httpMock
      .expectOne(METADATA_URL)
      .flush({ message: 'Formulario login nao encontrado' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Formulario login nao encontrado');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    const tentar = [...(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)].find(
      (botao) => botao.textContent?.includes('Tentar novamente'),
    );
    tentar?.click();
    fixture.detectChanges();

    httpMock.expectOne(METADATA_URL).flush(METADATA);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeTruthy();
  });

  it('entrar envia o payload do contrato e navega para a home', () => {
    abrirLogin();

    entrar({ email: 'gsb@gmail.com', senha: '12345' });

    const requisicao = httpMock.expectOne(LOGIN_URL);
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ email: 'gsb@gmail.com', password: '12345' });

    requisicao.flush({ token: 'jwt-de-teste', user: { id: 1, name: 'Gabriel' } });
    fixture.detectChanges();

    expect(noticeMock.info).toHaveBeenCalledWith(LEGACY_MESSAGES.loginOk);
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('credenciais vazias mostram login invalido e nao chamam a API', () => {
    abrirLogin();

    entrar({});

    expect(noticeMock.error).toHaveBeenCalledWith(LEGACY_MESSAGES.loginInvalido);
    httpMock.expectNone(LOGIN_URL);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('401 mostra login invalido e nao navega', () => {
    abrirLogin();

    entrar({ email: 'gsb@gmail.com', senha: 'errada' });

    httpMock
      .expectOne(LOGIN_URL)
      .flush({ message: 'Email ou senha invalidos' }, { status: 401, statusText: 'Unauthorized' });
    fixture.detectChanges();

    expect(noticeMock.error).toHaveBeenCalledWith(LEGACY_MESSAGES.loginInvalido);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
