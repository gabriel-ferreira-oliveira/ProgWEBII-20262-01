import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';

/**
 * Tela LOGIN (FrameLogin): email + senha, checkbox "Lembrar senha"
 * (sem funcao — D-03/P-01) e botoes Entrar/Cadastrar.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.group({
    email: this.formBuilder.control(''),
    senha: this.formBuilder.control(''),
    lembrarSenha: this.formBuilder.control(false),
  });
  protected readonly carregando = signal(false);

  protected entrar(): void {
    if (this.carregando()) {
      return;
    }
    const { email, senha } = this.form.getRawValue();
    this.carregando.set(true);
    this.auth.login({ email, password: senha }).subscribe({
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
