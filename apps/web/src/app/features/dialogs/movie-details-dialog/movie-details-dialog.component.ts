import { Component, Inject, inject, signal } from '@angular/core';
import { effect } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import { MoviesApiService } from '../../../core/api/movies-api.service';
import { extractApiMessage } from '../../../core/http/api-error';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';
import { MediaImageComponent } from '../../../shared/media-image/media-image.component';
import { caminhoImagemFilme, formatNumber, formatText } from '../../../shared/utils/format';

export interface MovieDetailsDialogData {
  readonly movieId: number;
}

export interface MediaDetailsDialogResult {
  readonly deleted: boolean;
}

function mensagemDeErro(error: unknown, fallback: string): string {
  return extractApiMessage(error) ?? fallback;
}

/**
 * Modal "Detalhes do Filme" (DetalhesFilme no legado):
 * sinopse editavel com Salvar, Favoritar, Marcar como Assistido e Deletar.
 * Sem botao Voltar (paridade: fecha pelo X/ESC) — B-07 aprovado na Fase 4.
 */
@Component({
  selector: 'app-movie-details-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatProgressBarModule, MediaImageComponent],
  templateUrl: './movie-details-dialog.component.html',
  styleUrl: './movie-details-dialog.component.scss',
})
export class MovieDetailsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<MovieDetailsDialogComponent, MediaDetailsDialogResult>);
  private readonly moviesApi = inject(MoviesApiService);
  private readonly notices = inject(NoticeService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly filme = rxResource({
    stream: () => this.moviesApi.get(this.data.movieId),
  });
  protected readonly sinopse = this.formBuilder.control('');
  protected readonly salvando = signal(false);
  protected readonly ocupado = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: MovieDetailsDialogData) {
    effect(() => {
      const filme = this.filme.value();
      if (filme !== undefined) {
        this.sinopse.setValue(filme.synopsis ?? '');
      }
    });
  }

  protected caminhoImagem(): string {
    return caminhoImagemFilme(this.data.movieId);
  }

  protected formatarNumero(value: number | null): string {
    return formatNumber(value);
  }

  protected formatarTexto(value: string | null): string {
    return formatText(value);
  }

  protected recarregar(): void {
    this.filme.reload();
  }

  protected salvar(): void {
    if (this.salvando() || this.ocupado()) {
      return;
    }
    this.salvando.set(true);
    this.moviesApi
      .updateSynopsis(this.data.movieId, { synopsis: this.sinopse.value })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.notices.info(LEGACY_MESSAGES.sinopseAlterada);
          this.filme.reload();
        },
        error: (error: unknown) => {
          this.salvando.set(false);
          this.notices.error(mensagemDeErro(error, 'Falha ao salvar a sinopse!'));
        },
      });
  }

  protected assistir(): void {
    if (this.ocupado() || this.salvando()) {
      return;
    }
    this.ocupado.set(true);
    this.moviesApi.watch(this.data.movieId).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.notices.info(LEGACY_MESSAGES.assistidoOk);
      },
      error: () => {
        this.ocupado.set(false);
        this.notices.error(LEGACY_MESSAGES.falhaAssistido);
      },
    });
  }

  protected favoritar(): void {
    if (this.ocupado() || this.salvando()) {
      return;
    }
    this.ocupado.set(true);
    this.moviesApi.favorite(this.data.movieId).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.notices.info(LEGACY_MESSAGES.favoritoOk);
      },
      error: () => {
        this.ocupado.set(false);
        this.notices.error(LEGACY_MESSAGES.falhaFavorito);
      },
    });
  }

  protected deletar(): void {
    if (this.ocupado() || this.salvando()) {
      return;
    }
    this.ocupado.set(true);
    this.moviesApi.remove(this.data.movieId).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.notices.info(LEGACY_MESSAGES.filmeRemovido);
        this.dialogRef.close({ deleted: true });
      },
      error: (error: unknown) => {
        this.ocupado.set(false);
        // O legado mostrava "Falha ao remover Serie!" por engano ao remover filme
        // (copy-paste); na web usamos a mensagem correta (docs/fase4_frontend.md).
        this.notices.error(mensagemDeErro(error, 'Falha ao remover Filme!'));
      },
    });
  }
}
