import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../api-config';
import { MetadataApiService } from './metadata-api.service';

const METADATA_FAKE: FormMetadata = {
  fields: [
    { name: 'name', label: 'Nome', control: 'text', order: 1, required: true },
    { name: 'bio', label: 'Sobre', control: 'textarea', order: 2, required: false },
  ],
  rules: [],
};

describe('MetadataApiService', () => {
  let service: MetadataApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MetadataApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('estado inicial: sem carregamento, sem erro e sem metadados', () => {
    expect(service.carregando()).toBe(false);
    expect(service.erro()).toBeNull();
    expect(service.metadata()).toBeNull();
  });

  it('carregar: GET no endpoint publico e estado ok com o descritor', () => {
    service.carregar('register');

    expect(service.carregando()).toBe(true);
    const requisicao = httpMock.expectOne(`${API_BASE_URL}/metadata/register`);
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(METADATA_FAKE);

    expect(service.carregando()).toBe(false);
    expect(service.erro()).toBeNull();
    expect(service.metadata()).toEqual(METADATA_FAKE);
  });

  it('erro da API: guarda a mensagem do filtro (string) e desliga o carregamento', () => {
    service.carregar('nao-existe');
    httpMock.expectOne(`${API_BASE_URL}/metadata/nao-existe`).flush(
      { statusCode: 404, message: 'Formulario nao-existe nao encontrado', error: 'Not Found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(service.carregando()).toBe(false);
    expect(service.metadata()).toBeNull();
    expect(service.erro()).toBe('Formulario nao-existe nao encontrado');
  });

  it('erro da API com message array: junta as mensagens', () => {
    service.carregar('register');
    httpMock.expectOne(`${API_BASE_URL}/metadata/register`).flush(
      { statusCode: 400, message: ['a falhou', 'b falhou'], error: 'Bad Request' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(service.erro()).toBe('a falhou; b falhou');
  });

  it('falha de rede (sem corpo da API): usa a mensagem padrao', () => {
    service.carregar('register');
    httpMock.expectOne(`${API_BASE_URL}/metadata/register`).error(new ProgressEvent('error'));

    expect(service.carregando()).toBe(false);
    expect(service.erro()).toBe('Falha ao carregar o formulario');
  });

  it('retry: limpa o erro anterior ao recarregar e entrega o descritor', () => {
    service.carregar('register');
    httpMock.expectOne(`${API_BASE_URL}/metadata/register`).error(new ProgressEvent('error'));
    expect(service.erro()).not.toBeNull();

    service.carregar('register');
    expect(service.erro()).toBeNull();
    httpMock.expectOne(`${API_BASE_URL}/metadata/register`).flush(METADATA_FAKE);

    expect(service.metadata()).toEqual(METADATA_FAKE);
    expect(service.carregando()).toBe(false);
  });
});
