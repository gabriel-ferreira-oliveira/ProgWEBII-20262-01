import { Component, Injector, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import type { MediaResumo } from '../../core/media/media-kind';
import { MediaKindRegistry } from '../../core/media/media-kind.registry';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { chunkRows } from '../../shared/utils/chunk-rows';
import { MediaDetailsDialogComponent } from '../dialogs/media-details-dialog/media-details-dialog.component';
import type {
  MediaDetailsDialogData,
  MediaDetailsDialogResult,
} from '../dialogs/media-details-dialog/media-details-dialog.component';

/** Midias por linha das telas de catalogo (FILMES_POR_LINHA/SERIES_POR_LINHA do legado). */
const MIDIAS_POR_LINHA = 3;

/**
 * Tela "Todas/os" de qualquer tipo de midia (`/media/:kind`, FrameFilmes/FrameSerie
 * do legado): grade 3 por linha com rolagem. Titulo, mensagens, imagens e linhas
 * de card vem do descritor `@MediaKind` — uma tela cobre todos os tipos.
 */
@Component({
  selector: 'app-media-list',
  imports: [MatProgressBarModule, MediaCardComponent],
  templateUrl: './media-list.component.html',
  styleUrl: './media-list.component.scss',
})
export class MediaListComponent {
  private readonly registry = inject(MediaKindRegistry);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  /** Param `:kind` da rota (withComponentInputBinding). */
  readonly kind = input.required<string>();

  protected readonly entrada = computed(() => this.registry.porKey(this.kind()) ?? null);
  protected readonly api = computed(() => {
    const entrada = this.entrada();
    return entrada === null ? null : this.injector.get(entrada.api);
  });
  protected readonly midias = rxResource({
    params: () => this.api(),
    stream: ({ params }) => (params === null ? of<MediaResumo[]>([]) : params.list()),
  });
  protected readonly linhas = computed(() =>
    chunkRows(this.midias.value() ?? [], MIDIAS_POR_LINHA),
  );

  protected caminhoImagem(id: number): string {
    return this.entrada()?.metadados.imagePath(id) ?? '';
  }

  protected linhasCard(midia: MediaResumo): readonly string[] {
    return this.entrada()?.metadados.cardLines(midia) ?? [];
  }

  protected abrir(midia: MediaResumo): void {
    const ref = this.dialog.open<
      MediaDetailsDialogComponent,
      MediaDetailsDialogData,
      MediaDetailsDialogResult
    >(MediaDetailsDialogComponent, {
      data: { kind: this.kind(), id: midia.id },
      width: '900px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.deleted === true) {
        // Legado: apos remover, volta para a tela principal.
        void this.router.navigate(['/home']);
        return;
      }
      this.midias.reload();
    });
  }
}
