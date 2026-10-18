import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import type { FormMetadata } from '@ceviu/shared';
import { API_BASE_URL } from '../api-config';
import { extractApiMessage } from '../http/api-error';

/** Mensagem usada quando a resposta nao veio da API (rede fora do ar etc.). */
const FALLBACK_ERROR = 'Falha ao carregar o formulario';

/**
 * Busca os metadados de formulario publicados pela API (`GET /api/metadata/:form`, T3.4)
 * e expoe o estado **loading/erro/ok** com signals. `carregar()` de novo = retry
 * (limpa o erro anterior e mantem o ultimo descritor carregado ate chegar outro).
 * O endpoint e publico — nao precisa de token.
 */
@Injectable({ providedIn: 'root' })
export class MetadataApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/metadata`;

  private readonly metadataState = signal<FormMetadata | null>(null);
  private readonly carregandoState = signal(false);
  private readonly erroState = signal<string | null>(null);

  /** Descritor carregado (null enquanto nenhum chegou com sucesso). */
  readonly metadata = this.metadataState.asReadonly();
  /** true enquanto a requisicao esta em andamento. */
  readonly carregando = this.carregandoState.asReadonly();
  /** Mensagem de erro da ultima tentativa (null = sem erro). */
  readonly erro = this.erroState.asReadonly();

  /** Carrega (ou recarrega, para retry) o descritor do formulario `form`. */
  carregar(form: string): void {
    this.carregandoState.set(true);
    this.erroState.set(null);
    this.http.get<FormMetadata>(`${this.baseUrl}/${form}`).subscribe({
      next: (metadata) => {
        this.metadataState.set(metadata);
        this.carregandoState.set(false);
      },
      error: (error: unknown) => {
        this.erroState.set(extractApiMessage(error) ?? FALLBACK_ERROR);
        this.carregandoState.set(false);
      },
    });
  }
}
