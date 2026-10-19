import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { SearchResultDto } from '@ceviu/shared';
import { of } from 'rxjs';
import { SearchApiService } from '../../core/api/search-api.service';
import { LEGACY_MESSAGES } from '../../core/legacy-messages';
import type { MediaResumo } from '../../core/media/media-kind';
import type { MediaKindEntry } from '../../core/media/media-kind.registry';
import { MediaKindRegistry } from '../../core/media/media-kind.registry';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { MediaDetailsDialogComponent } from '../dialogs/media-details-dialog/media-details-dialog.component';
import type {
  MediaDetailsDialogData,
  MediaDetailsDialogResult,
} from '../dialogs/media-details-dialog/media-details-dialog.component';

/** Secao de resultados de um tipo de midia (uma por `@MediaKind` registrado). */
interface SecaoResultado {
  readonly entrada: MediaKindEntry;
  readonly itens: readonly MediaResumo[];
}

/** `SearchResultDto` tem uma lista por tipo, indexada pela key do registry (`movies`/`series`). */
type ResultadoPorTipo = Record<string, readonly MediaResumo[]>;

/**
 * Tela "Catalogo - Resultados da Pesquisa" (DetalhesPesquisa): titulo com contagem
 * e uma secao por tipo de midia do registry — rotulos, contagens, imagens e linhas
 * de card vem do descritor `@MediaKind`.
 * Se a lista do filtro ficou vazia, a API responde 404 — tratado com a
 * mensagem de resultado vazio do legado.
 */
@Component({
  selector: 'app-search-results',
  imports: [MatProgressBarModule, MediaCardComponent],
  templateUrl: './search-results.component.html',
  styleUrl: './search-results.component.scss',
})
export class SearchResultsComponent {
  private readonly searchApi = inject(SearchApiService);
  private readonly registry = inject(MediaKindRegistry);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly mensagemVazio = LEGACY_MESSAGES.resultadoVazio;

  /** Vinculados pelo withComponentInputBinding (query params da home, como strings). */
  readonly title = input<string | undefined>(undefined);
  readonly id = input<string | undefined>(undefined);

  protected readonly resultados = rxResource({
    stream: () => {
      const titulo = this.title();
      const id = this.id();
      if (titulo !== undefined) {
        return this.searchApi.searchByTitle(titulo);
      }
      if (id !== undefined && /^\d+$/.test(id)) {
        return this.searchApi.searchById(Number(id));
      }
      return of<SearchResultDto | null>(null);
    },
  });

  protected readonly secoes = computed<readonly SecaoResultado[]>(() => {
    const resultado = this.resultados.value();
    if (resultado === null || resultado === undefined) {
      return [];
    }
    const porTipo = resultado as unknown as ResultadoPorTipo;
    return this.registry.entradas().map((entrada) => ({
      entrada,
      itens: porTipo[entrada.metadados.key] ?? [],
    }));
  });

  /** Contagens do titulo no formato do legado ("1 filmes, 2 séries"). */
  protected readonly contagens = computed(() =>
    this.secoes()
      .map((secao) => `${secao.itens.length} ${secao.entrada.metadados.searchCountLabel}`)
      .join(', '),
  );

  protected readonly vazio = computed(() => {
    const resultado = this.resultados.value();
    return (
      resultado !== null &&
      resultado !== undefined &&
      this.secoes().every((secao) => secao.itens.length === 0)
    );
  });

  protected abrir(secao: SecaoResultado, item: MediaResumo): void {
    const ref = this.dialog.open<
      MediaDetailsDialogComponent,
      MediaDetailsDialogData,
      MediaDetailsDialogResult
    >(MediaDetailsDialogComponent, {
      data: { kind: secao.entrada.metadados.key, id: item.id },
      width: '900px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.deleted === true) {
        // Legado volta para a tela principal apos remover.
        void this.router.navigate(['/home']);
        return;
      }
      this.resultados.reload();
    });
  }
}
