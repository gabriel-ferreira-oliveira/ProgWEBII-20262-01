import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { LoginRequestDto } from '@ceviu/shared';
import { AuthService } from '../../../core/auth/auth.service';
import { buildForm } from '../../../core/forms/build-form';
import { MetadataApiService } from '../../../core/forms/metadata-api.service';
import { payloadFromFields } from '../../../core/forms/payload';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';

/** Formulario publicado pela API para esta tela (`GET /api/metadata/login`). */
const FORM = 'login';

/**
 * Tela LOGIN (FrameLogin): email + senha dos metadados (`@Field` + motor de
 * validacao via `MetadataApiService`/`buildForm`) e checkbox "Lembrar senha"
 * sem funcao (D-03/P-01) — fica fora do formulario reativo, fora do contrato.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatProgressBarModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly metadataApi = inject(MetadataApiService);
  private readonly auth = inject(AuthService);
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
  /** Login em andamento (bloqueia cliques repetidos). */
  protected readonly carregando = signal(false);

  ngOnInit(): void {
    this.recarregarMetadados();
  }

  protected recarregarMetadados(): void {
    this.metadataApi.carregar(FORM);
  }

  protected entrar(): void {
    const formulario = this.form();
    if (this.carregando() || formulario === null) {
      return;
    }
    if (formulario.invalid) {
      // Paridade: credenciais ausentes caem em "Email ou senha inválidos!".
      this.notices.error(LEGACY_MESSAGES.loginInvalido);
      return;
    }
    // Payload do contrato (`LoginRequestDto`): nomes do descritor = propriedades do DTO.
    const payload = payloadFromFields(
      this.campos(),
      formulario.getRawValue(),
    ) as unknown as LoginRequestDto;
    this.carregando.set(true);
    this.auth.login(payload).subscribe({
      next: () => {
        this.carregando.set(false);
        this.notices.info(LEGACY_MESSAGES.loginOk);
        void this.router.navigate(['/home']);
      },
      error: (error: unknown) => {
        this.carregando.set(false);
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.notices.error(LEGACY_MESSAGES.loginInvalido);
          return;
        }
        this.notices.error('Falha ao conectar com o servidor!');
      },
    });
  }

  protected irParaCadastro(): void {
    void this.router.navigate(['/register']);
  }
}
