import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import type { RegisterRequestDto } from '@ceviu/shared';
import { AuthApiService } from '../../../core/auth/auth-api.service';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';

/**
 * Tela CADASTRO (FrameCadastro): Nome, Email, Idade, Senha, Sobre.
 * O combo de Pais existe no legado mas nunca foi exibido (D-02: pais fixo "Brasil").
 * Idade e obrigatoria e inteira >= 0 (o legado fazia Integer.parseInt na acao de cadastrar).
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.group({
    nome: this.formBuilder.control('', Validators.required),
    email: this.formBuilder.control('', Validators.required),
    idade: this.formBuilder.control('', [Validators.required, Validators.pattern(/^\d+$/)]),
    senha: this.formBuilder.control('', Validators.required),
    sobre: this.formBuilder.control(''),
  });
  protected readonly carregando = signal(false);

  protected cadastrar(): void {
    if (this.carregando()) {
      return;
    }
    if (this.form.invalid) {
      this.notices.error(LEGACY_MESSAGES.cadastroInvalido);
      return;
    }
    const { nome, email, idade, senha, sobre } = this.form.getRawValue();
    const payload: RegisterRequestDto = {
      name: nome,
      email,
      password: senha,
      age: Number.parseInt(idade, 10),
      bio: sobre,
    };
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

  protected limparCampos(): void {
    this.form.reset();
  }

  protected voltar(): void {
    void this.router.navigate(['/login']);
  }
}
