import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { MovieDto, SearchResultDto, SeriesDto } from '@ceviu/shared';
import { of } from 'rxjs';
import { SearchApiService } from '../../core/api/search-api.service';
import { LEGACY_MESSAGES } from '../../core/legacy-messages';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { caminhoImagemFilme, caminhoImagemSerie, formatNumber } from '../../shared/utils/format';
import { MovieDetailsDialogComponent } from '../dialogs/movie-details-dialog/movie-details-dialog.component';
import type {
  MediaDetailsDialogResult,
  MovieDetailsDialogData,
} from '../dialogs/movie-details-dialog/movie-details-dialog.component';
import { SeriesDetailsDialogComponent } from '../dialogs/series-details-dialog/series-details-dialog.component';
import type { SeriesDetailsDialogData } from '../dialogs/series-details-dialog/series-details-dialog.component';

/**
 * Tela "Catalogo - Resultados da Pesquisa" (DetalhesPesquisa):
 * titulo com contagem, secoes Filmes/Series, cards com "Ver Detalhes".
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

  protected readonly vazio = computed(() => {
    const resultado = this.resultados.value();
    return (
      resultado !== null &&
      resultado !== undefined &&
      resultado.movies.length === 0 &&
      resultado.series.length === 0
    );
  });

  protected caminhoFilme(id: number): string {
    return caminhoImagemFilme(id);
  }

  protected caminhoSerie(id: number): string {
    return caminhoImagemSerie(id);
  }

  /** Card de filme do legado: "(" + ano + ")". */
  protected linhaFilme(filme: MovieDto): string[] {
    return [`(${formatNumber(filme.year)})`];
  }

  /** Card de serie do legado: "(" + ano + " - " + temporada + " temp.)". */
  protected linhaSerie(serie: SeriesDto): string[] {
    return [`(${formatNumber(serie.year)} - ${serie.season} temp.)`];
  }

  protected abrirFilme(filme: MovieDto): void {
    const ref = this.dialog.open<
      MovieDetailsDialogComponent,
      MovieDetailsDialogData,
      MediaDetailsDialogResult
    >(MovieDetailsDialogComponent, {
      data: { movieId: filme.id },
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

  protected abrirSerie(serie: SeriesDto): void {
    const ref = this.dialog.open<
      SeriesDetailsDialogComponent,
      SeriesDetailsDialogData,
      MediaDetailsDialogResult
    >(SeriesDetailsDialogComponent, {
      data: { seriesId: serie.id },
      width: '900px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.deleted === true) {
        void this.router.navigate(['/home']);
        return;
      }
      this.resultados.reload();
    });
  }
}
