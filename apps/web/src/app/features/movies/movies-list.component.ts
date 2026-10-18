import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { MovieDto } from '@ceviu/shared';
import { MoviesApiService } from '../../core/api/movies-api.service';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { chunkRows } from '../../shared/utils/chunk-rows';
import { caminhoImagemFilme, formatNumber, formatText } from '../../shared/utils/format';
import { MovieDetailsDialogComponent } from '../dialogs/movie-details-dialog/movie-details-dialog.component';
import type {
  MediaDetailsDialogResult,
  MovieDetailsDialogData,
} from '../dialogs/movie-details-dialog/movie-details-dialog.component';

/** Filmes por linha (FILMES_POR_LINHA do legado). */
const FILMES_POR_LINHA = 3;

/** Tela "Todos os Filmes" (FrameFilmes): grade 3 por linha com rolagem. */
@Component({
  selector: 'app-movies-list',
  imports: [MatProgressBarModule, MediaCardComponent],
  templateUrl: './movies-list.component.html',
  styleUrl: './movies-list.component.scss',
})
export class MoviesListComponent {
  private readonly moviesApi = inject(MoviesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly filmes = rxResource({ stream: () => this.moviesApi.list() });
  protected readonly linhas = computed(() =>
    chunkRows(this.filmes.value() ?? [], FILMES_POR_LINHA),
  );

  protected caminhoImagem(id: number): string {
    return caminhoImagemFilme(id);
  }

  protected linhasFilme(filme: MovieDto): string[] {
    return [`Ano: ${formatNumber(filme.year)}`, `Gênero: ${formatText(filme.genre)}`];
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
        // Legado: apos remover, volta para a tela principal.
        void this.router.navigate(['/home']);
        return;
      }
      this.filmes.reload();
    });
  }
}
