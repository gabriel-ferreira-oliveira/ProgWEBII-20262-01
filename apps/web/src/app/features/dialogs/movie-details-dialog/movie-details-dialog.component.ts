import { Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { effect } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import type { UpdateSynopsisRequestDto } from '@ceviu/shared';
import { MoviesApiService } from '../../../core/api/movies-api.service';
import { buildForm } from '../../../core/forms/build-form';
import { MetadataApiService } from '../../../core/forms/metadata-api.service';
import { payloadFromFields } from '../../../core/forms/payload';
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

/** Formulario publicado pela API para a sinopse do filme (`GET /api/metadata/movie-synopsis`). */
const FORM = 'movie-synopsis';

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
export class MovieDetailsDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<MovieDetailsDialogComponent, MediaDetailsDialogResult>);
  private readonly moviesApi = inject(MoviesApiService);
  private readonly metadataApi = inject(MetadataApiService);
  private readonly notices = inject(NoticeService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly filme = rxResource({
    stream: () => this.moviesApi.get(this.data.movieId),
  });
  /** Campos do formulario de sinopse (do descritor, ordem de UI). */
  protected readonly campos = computed(() => this.metadataApi.metadata()?.fields ?? []);
  /** Formulario montado quando o descritor chega. */
  protected readonly form = computed(() => {
    const metadata = this.metadataApi.metadata();
    return metadata === null ? null : buildForm(this.formBuilder, metadata.fields);
  });
  protected readonly salvando = signal(false);
  protected readonly ocupado = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: MovieDetailsDialogData) {
    effect(() => {
      const filme = this.filme.value();
      const formulario = this.form();
      if (filme !== undefined && formulario !== null) {
        formulario.controls['synopsis']?.setValue(filme.synopsis ?? '');
      }
    });
  }

  ngOnInit(): void {
    this.metadataApi.carregar(FORM);
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
    const formulario = this.form();
    if (this.salvando() || this.ocupado() || formulario === null) {
      return;
    }
    // Sem gate de validade: o servidor aceita sinopse vazia (`@IsString` sem `@IsNotEmpty`).
    const payload = payloadFromFields(
      this.campos(),
      formulario.getRawValue(),
    ) as unknown as UpdateSynopsisRequestDto;
    this.salvando.set(true);
    this.moviesApi
      .updateSynopsis(this.data.movieId, payload)
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
