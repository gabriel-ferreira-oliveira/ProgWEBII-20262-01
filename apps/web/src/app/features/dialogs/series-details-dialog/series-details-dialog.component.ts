import { Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { effect } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import type { UpdateSynopsisRequestDto } from '@ceviu/shared';
import { SeriesApiService } from '../../../core/api/series-api.service';
import { buildForm } from '../../../core/forms/build-form';
import { MetadataApiService } from '../../../core/forms/metadata-api.service';
import { payloadFromFields } from '../../../core/forms/payload';
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

/** Formulario publicado pela API para a sinopse da serie (`GET /api/metadata/series-synopsis`). */
const FORM = 'series-synopsis';

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
export class SeriesDetailsDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<SeriesDetailsDialogComponent, MediaDetailsDialogResult>);
  private readonly seriesApi = inject(SeriesApiService);
  private readonly metadataApi = inject(MetadataApiService);
  private readonly notices = inject(NoticeService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly serie = rxResource({
    stream: () => this.seriesApi.get(this.data.seriesId),
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

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: SeriesDetailsDialogData) {
    effect(() => {
      const serie = this.serie.value();
      const formulario = this.form();
      if (serie !== undefined && formulario !== null) {
        formulario.controls['synopsis']?.setValue(serie.synopsis ?? '');
      }
    });
  }

  ngOnInit(): void {
    this.metadataApi.carregar(FORM);
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
    this.seriesApi
      .updateSynopsis(this.data.seriesId, payload)
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
