import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { MovieDto, SeriesDto } from '@ceviu/shared';
import { MoviesApiService } from '../../core/api/movies-api.service';
import { SeriesApiService } from '../../core/api/series-api.service';
import { LEGACY_MESSAGES } from '../../core/legacy-messages';
import { NoticeService } from '../../core/notices/notice.service';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { caminhoImagemFilme, caminhoImagemSerie, formatNumber, formatText } from '../../shared/utils/format';
import { MovieDetailsDialogComponent } from '../dialogs/movie-details-dialog/movie-details-dialog.component';
import type {
  MediaDetailsDialogResult,
  MovieDetailsDialogData,
} from '../dialogs/movie-details-dialog/movie-details-dialog.component';
import { SeriesDetailsDialogComponent } from '../dialogs/series-details-dialog/series-details-dialog.component';
import type { SeriesDetailsDialogData } from '../dialogs/series-details-dialog/series-details-dialog.component';

/** Quantidade de populares exibida na home (TOTALPRINCIPAL do legado). */
const TOTAL_POPULARES = 4;

/**
 * Tela Principal (FramePrincipal): painel "Pesquisar" (Nome/ID),
 * "Filmes Populares" e "Series Populares" (4 cards + "Ver mais").
 */
@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, MatProgressBarModule, MediaCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly moviesApi = inject(MoviesApiService);
  private readonly seriesApi = inject(SeriesApiService);
  private readonly notices = inject(NoticeService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly filmes = rxResource({ stream: () => this.moviesApi.list() });
  protected readonly series = rxResource({ stream: () => this.seriesApi.list() });

  protected readonly filmesPopulares = computed(() =>
    (this.filmes.value() ?? []).slice(0, TOTAL_POPULARES),
  );
  protected readonly seriesPopulares = computed(() =>
    (this.series.value() ?? []).slice(0, TOTAL_POPULARES),
  );

  protected readonly form = this.formBuilder.group({
    nome: this.formBuilder.control(''),
    id: this.formBuilder.control(''),
  });

  protected caminhoFilme(id: number): string {
    return caminhoImagemFilme(id);
  }

  protected caminhoSerie(id: number): string {
    return caminhoImagemSerie(id);
  }

  protected linhasFilme(filme: MovieDto): string[] {
    return [`Ano: ${formatNumber(filme.year)}`, `Gênero: ${formatText(filme.genre)}`];
  }

  protected linhasSerie(serie: SeriesDto): string[] {
    return [`Ano: ${formatNumber(serie.year)}`, `Gênero: ${formatText(serie.genre)}`];
  }

  /** Regras do bloco COMANDO_PESQUISA do legado (um filtro obrigatorio). */
  protected pesquisar(): void {
    const nome = this.form.controls.nome.value;
    const id = this.form.controls.id.value;

    if (nome === '' && id === '') {
      this.notices.error(LEGACY_MESSAGES.pesquisaVazia);
      return;
    }
    if (nome !== '' && id !== '') {
      this.notices.error(LEGACY_MESSAGES.pesquisaDoisCampos);
      return;
    }
    if (nome !== '') {
      void this.router.navigate(['/search'], { queryParams: { title: nome } });
      return;
    }
    if (!/^\d+$/.test(id)) {
      // No legado um id nao numerico gerava excecao (tela nao reagia);
      // na web mostramos a mensagem de campos invalidos (docs/fase4_frontend.md).
      this.notices.error(LEGACY_MESSAGES.cadastroInvalido);
      return;
    }
    void this.router.navigate(['/search'], { queryParams: { id } });
  }

  protected limparCampos(): void {
    this.form.reset();
  }

  protected verTodosFilmes(): void {
    void this.router.navigate(['/movies']);
  }

  protected verTodasSeries(): void {
    void this.router.navigate(['/series']);
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
        void this.router.navigate(['/home']);
      }
      this.filmes.reload();
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
      }
      this.series.reload();
    });
  }
}
