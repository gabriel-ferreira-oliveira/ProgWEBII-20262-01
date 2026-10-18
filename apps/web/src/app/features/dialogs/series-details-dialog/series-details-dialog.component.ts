import { Component, Inject, inject, signal } from '@angular/core';
import { effect } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import { SeriesApiService } from '../../../core/api/series-api.service';
import { extractApiMessage } from '../../../core/http/api-error';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { NoticeService } from '../../../core/notices/notice.service';
import { MediaImageComponent } from '../../../shared/media-image/media-image.component';
import { caminhoImagemSerie, formatNumber, formatText } from '../../../shared/utils/format';

export interface SeriesDetailsDialogData {
  readonly seriesId: number;
}

export interface MediaDetailsDialogResult {
  readonly deleted: boolean;
}

function mensagemDeErro(error: unknown, fallback: string): string {
  return extractApiMessage(error) ?? fallback;
}

/**
 * Modal "Detalhes da Serie" (DetalhesSerie no legado).
 * Paridade: exibe Ano/Duracao/Genero (nao exibe episodios nem temporada aqui),
 * sinopse editavel com Salvar, Favoritar, Marcar como Assistido e Deletar.
 * Sem botao Voltar (B-07 aprovado na Fase 4).
 */
@Component({
  selector: 'app-series-details-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatProgressBarModule, MediaImageComponent],
  templateUrl: './series-details-dialog.component.html',
  styleUrl: './series-details-dialog.component.scss',
})
export class SeriesDetailsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<SeriesDetailsDialogComponent, MediaDetailsDialogResult>);
  private readonly seriesApi = inject(SeriesApiService);
  private readonly notices = inject(NoticeService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly serie = rxResource({
    stream: () => this.seriesApi.get(this.data.seriesId),
  });
  protected readonly sinopse = this.formBuilder.control('');
  protected readonly salvando = signal(false);
  protected readonly ocupado = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: SeriesDetailsDialogData) {
    effect(() => {
      const serie = this.serie.value();
      if (serie !== undefined) {
        this.sinopse.setValue(serie.synopsis ?? '');
      }
    });
  }

  protected caminhoImagem(): string {
    return caminhoImagemSerie(this.data.seriesId);
  }

  protected formatarNumero(value: number | null): string {
    return formatNumber(value);
  }

  protected formatarTexto(value: string | null): string {
    return formatText(value);
  }

  protected recarregar(): void {
    this.serie.reload();
  }

  protected salvar(): void {
    if (this.salvando() || this.ocupado()) {
      return;
    }
    this.salvando.set(true);
    this.seriesApi
      .updateSynopsis(this.data.seriesId, { synopsis: this.sinopse.value })
      .subscribe({
        next: () => {
          this.salvando.set(false);
          this.notices.info(LEGACY_MESSAGES.sinopseAlterada);
          this.serie.reload();
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
    this.seriesApi.watch(this.data.seriesId).subscribe({
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
    this.seriesApi.favorite(this.data.seriesId).subscribe({
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
    this.seriesApi.remove(this.data.seriesId).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.notices.info(LEGACY_MESSAGES.serieRemovida);
        this.dialogRef.close({ deleted: true });
      },
      error: (error: unknown) => {
        this.ocupado.set(false);
        this.notices.error(mensagemDeErro(error, 'Falha ao remover Serie!'));
      },
    });
  }
}
