import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { RegisterRequestDto } from '@ceviu/shared';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { buildForm } from '../../../core/forms/build-form';
import { MetadataApiService } from '../../../core/forms/metadata-api.service';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';

/** Formulario publicado pela API para esta tela (`GET /api/metadata/register`). */
const FORM = 'register';

/**
 * Tela CADASTRO: os campos e a validacao vem dos metadados publicados pela API
 * (`@Field` + motor de validacao, T3.1-T3.4 via `MetadataApiService` T3.6 e
 * `buildForm` T3.7) — nada de campo hardcoded. O combo de Pais existe no legado
 * mas nunca foi exibido (D-02: pais fixo "Brasil").
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, MatProgressBarModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly metadataApi = inject(MetadataApiService);
  private readonly authApi = inject(AuthApiService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);

  protected readonly carregandoMetadados = this.metadataApi.carregando;
  protected readonly erroMetadados = this.metadataApi.erro;
  /** Campos na ordem de UI do descritor. */
  protected readonly campos = computed(() => this.metadataApi.metadata()?.fields ?? []);
  /** Formulario montado quando o descritor chega (recriado a cada carregamento). */
  protected readonly form = computed(() => {
    const metadata = this.metadataApi.metadata();
    return metadata === null ? null : buildForm(this.formBuilder, metadata.fields);
  });
  /** Envio em andamento (bloqueia cadastrar duplicado). */
  protected readonly carregando = signal(false);

  ngOnInit(): void {
    this.recarregarMetadados();
  }

  protected recarregarMetadados(): void {
    this.metadataApi.carregar(FORM);
  }

  protected cadastrar(): void {
    const formulario = this.form();
    if (this.carregando() || formulario === null) {
      return;
    }
    if (formulario.invalid) {
      this.notices.error(LEGACY_MESSAGES.cadastroInvalido);
      return;
    }
    const payload = this.montarPayload(formulario.getRawValue());
    this.carregando.set(true);
    this.authApi.register(payload).subscribe({
      next: () => {
        this.carregando.set(false);
        this.notices.info(LEGACY_MESSAGES.cadastroOk);
        void this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        this.carregando.set(false);
        if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 409)) {
          // Paridade: o legado responde "Campos inválidos!" para cadastro recusado
          // (email duplicado tambem cai nessa mensagem).
          this.notices.error(LEGACY_MESSAGES.cadastroInvalido);
          return;
        }
        this.notices.error('Falha ao conectar com o servidor!');
      },
    });
  }

  /**
   * Payload do contrato (`RegisterRequestDto`): os nomes do descritor sao as
   * propriedades do DTO (contrato verificado no e2e); `control: 'number'` converte
   * com `Number.parseInt` (paridade com o `Integer.parseInt` do legado).
   */
  private montarPayload(valores: Record<string, string>): RegisterRequestDto {
    const payload: Record<string, string | number> = {};
    for (const campo of this.campos()) {
      const valor = valores[campo.name];
      payload[campo.name] = campo.control === 'number' ? Number.parseInt(valor, 10) : valor;
    }
    return payload as unknown as RegisterRequestDto;
  }

  protected limparCampos(): void {
    this.form()?.reset();
  }

  protected voltar(): void {
    void this.router.navigate(['/login']);
  }
}
