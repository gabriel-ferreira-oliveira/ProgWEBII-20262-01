import { Component, Inject, Injector, OnInit, computed, effect, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import type { UpdateSynopsisRequestDto } from '@ceviu/shared';
import { of } from 'rxjs';
import { buildForm } from '../../../core/forms/build-form';
import { MetadataApiService } from '../../../core/forms/metadata-api.service';
import { payloadFromFields } from '../../../core/forms/payload';
import { extractApiMessage } from '../../../core/http/api-error';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import type { DetalheMidia, MediaResumo } from '../../../core/media/media-kind';
import { MediaKindRegistry } from '../../../core/media/media-kind.registry';
import { NoticeService } from '../../../core/notices/notice.service';
import { MediaImageComponent } from '../../../shared/media-image/media-image.component';

export interface MediaDetailsDialogData {
  /** Key do tipo de midia no registry (filmes, series...). */
  readonly kind: string;
  readonly id: number;
}

export interface MediaDetailsDialogResult {
  readonly deleted: boolean;
}

function mensagemDeErro(error: unknown, fallback: string): string {
  return extractApiMessage(error) ?? fallback;
}

/**
 * Modal "Detalhes" de qualquer tipo de midia (DetalhesFilme/DetalhesSerie do
 * legado): tudo que muda por tipo (titulo, linhas, formulario, mensagens, API)
 * vem do descritor `@MediaKind` — nenhuma tela nova por tipo.
 */
@Component({
  selector: 'app-media-details-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatProgressBarModule, MediaImageComponent],
  templateUrl: './media-details-dialog.component.html',
  styleUrl: './media-details-dialog.component.scss',
})
export class MediaDetailsDialogComponent implements OnInit {
  private readonly dialogRef = inject(
    MatDialogRef<MediaDetailsDialogComponent, MediaDetailsDialogResult>,
  );
  private readonly registry = inject(MediaKindRegistry);
  private readonly injector = inject(Injector);
  private readonly metadataApi = inject(MetadataApiService);
  private readonly notices = inject(NoticeService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  /** Descritor do tipo aberto (vindo do registry). */
  protected readonly entrada = computed(() => this.registry.porKey(this.data.kind) ?? null);
  /** Servico HTTP do tipo (classe achada pelo registry). */
  protected readonly api = computed(() => {
    const entrada = this.entrada();
    return entrada === null ? null : this.injector.get(entrada.api);
  });
  protected readonly midia = rxResource({
    params: () => ({ api: this.api(), id: this.data.id }),
    stream: ({ params }) =>
      params.api === null ? of<MediaResumo | undefined>(undefined) : params.api.get(params.id),
  });
  /** Campos do formulario (do descritor da API, ordem de UI). */
  protected readonly campos = computed(() => this.metadataApi.metadata()?.fields ?? []);
  /** Formulario montado quando o descritor chega. */
  protected readonly form = computed(() => {
    const metadata = this.metadataApi.metadata();
    return metadata === null ? null : buildForm(this.formBuilder, metadata.fields);
  });
  protected readonly titulo = computed(() => {
    const entrada = this.entrada();
    const item = this.midia.value();
    return entrada === null
      ? ''
      : `${entrada.metadados.dialogTitlePrefix} - ${item?.title ?? ''}`;
  });
  protected readonly erroCarregamento = computed(
    () => this.entrada()?.metadados.dialogLoadError ?? '',
  );
  protected readonly salvando = signal(false);
  protected readonly ocupado = signal(false);

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: MediaDetailsDialogData) {
    effect(() => {
      const item = this.midia.value();
      const formulario = this.form();
      if (item === undefined || formulario === null) {
        return;
      }
      for (const campo of this.campos()) {
        const valor = (item as unknown as Record<string, unknown>)[campo.name];
        formulario.get(campo.name)?.setValue((valor ?? '') as string);
      }
    });
  }

  ngOnInit(): void {
    const entrada = this.entrada();
    if (entrada !== null) {
      this.metadataApi.carregar(entrada.metadados.form);
    }
  }

  protected caminhoImagem(): string {
    const entrada = this.entrada();
    return entrada === null ? '' : entrada.metadados.imagePath(this.data.id);
  }

  protected linhasDetalhe(item: MediaResumo): readonly DetalheMidia[] {
    return this.entrada()?.metadados.detailLines(item) ?? [];
  }

  protected recarregar(): void {
    this.midia.reload();
  }

  protected salvar(): void {
    const formulario = this.form();
    const api = this.api();
    if (this.salvando() || this.ocupado() || formulario === null || api === null) {
      return;
    }
    // Sem gate de validade: o servidor aceita sinopse vazia (`@IsString` sem `@IsNotEmpty`).
    const payload = payloadFromFields(
      this.campos(),
      formulario.getRawValue(),
    ) as unknown as UpdateSynopsisRequestDto;
    this.salvando.set(true);
    api.updateSynopsis(this.data.id, payload).subscribe({
      next: () => {
        this.salvando.set(false);
        this.notices.info(LEGACY_MESSAGES.sinopseAlterada);
        this.midia.reload();
      },
      error: (error: unknown) => {
        this.salvando.set(false);
        this.notices.error(mensagemDeErro(error, 'Falha ao salvar a sinopse!'));
      },
    });
  }

  protected assistir(): void {
    const api = this.api();
    if (this.ocupado() || this.salvando() || api === null) {
      return;
    }
    this.ocupado.set(true);
    api.watch(this.data.id).subscribe({
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
    const api = this.api();
    if (this.ocupado() || this.salvando() || api === null) {
      return;
    }
    this.ocupado.set(true);
    api.favorite(this.data.id).subscribe({
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
    const entrada = this.entrada();
    const api = this.api();
    if (this.ocupado() || this.salvando() || entrada === null || api === null) {
      return;
    }
    this.ocupado.set(true);
    api.remove(this.data.id).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.notices.info(entrada.metadados.deleteOkMessage);
        this.dialogRef.close({ deleted: true });
      },
      error: (error: unknown) => {
        this.ocupado.set(false);
        this.notices.error(mensagemDeErro(error, entrada.metadados.deleteErrorMessage));
      },
    });
  }
}
