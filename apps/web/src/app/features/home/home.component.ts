import { Component, OnInit, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { FormRule, MovieDto, SeriesDto } from '@ceviu/shared';
import { MoviesApiService } from '../../core/api/movies-api.service';
import { SeriesApiService } from '../../core/api/series-api.service';
import { MetadataApiService } from '../../core/forms/metadata-api.service';
import { NoticeService } from '../../core/notices/notice.service';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { caminhoImagemFilme, caminhoImagemSerie, formatNumber, formatText } from '../../shared/utils/format';
import { MediaDetailsDialogComponent } from '../dialogs/media-details-dialog/media-details-dialog.component';
import type {
  MediaDetailsDialogData,
  MediaDetailsDialogResult,
} from '../dialogs/media-details-dialog/media-details-dialog.component';

/** Quantidade de populares exibida na home (TOTALPRINCIPAL do legado). */
const TOTAL_POPULARES = 4;

/** Formulario publicado pela API para o filtro de pesquisa (`GET /api/metadata/search-catalog`). */
const FORM_PESQUISA = 'search-catalog';

/**
 * Tela Principal (FramePrincipal): painel "Pesquisar" (Nome/ID),
 * "Filmes Populares" e "Series Populares" (4 cards + "Ver mais").
 * A busca usa a regra `exactlyOneOf` publicada pela API (T2.7/T3.4): as mensagens
 * e os filtros vem do servidor — nada de regra duplicada aqui.
 */
@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, MatProgressBarModule, MediaCardComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly moviesApi = inject(MoviesApiService);
  private readonly seriesApi = inject(SeriesApiService);
  private readonly metadataApi = inject(MetadataApiService);
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

  /** Regra `exactlyOneOf` do descritor (properties da pesquisa + mensagens do servidor). */
  protected readonly regraPesquisa = computed<FormRule | undefined>(() =>
    this.metadataApi.metadata()?.rules.at(0),
  );

  /** Controles homonimos das properties da regra (`title`/`id`). */
  protected readonly form = this.formBuilder.group({
    title: this.formBuilder.control(''),
    id: this.formBuilder.control(''),
  });

  ngOnInit(): void {
    this.metadataApi.carregar(FORM_PESQUISA);
  }

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

  /** Regras do bloco COMANDO_PESQUISA do legado, dirigidas pela regra `exactlyOneOf` do servidor. */
  protected pesquisar(): void {
    const regra = this.regraPesquisa();
    if (regra === undefined) {
      // Contrato ainda nao carregado (a API que publica a regra e a mesma que alimenta a home).
      return;
    }
    const preenchidos = regra.properties.filter((propriedade) => this.valorDe(propriedade) !== '');
    if (preenchidos.length === 0) {
      this.notices.error(regra.missingMessage);
      return;
    }
    if (preenchidos.length > 1) {
      this.notices.error(regra.multipleMessage);
      return;
    }
    const [propriedade] = preenchidos;
    void this.router.navigate(['/search'], { queryParams: { [propriedade]: this.valorDe(propriedade) } });
  }

  /** Valor do controle homonimo da property do descritor ('' quando nao existe). */
  private valorDe(propriedade: string): string {
    return (this.form.getRawValue() as Record<string, string>)[propriedade] ?? '';
  }

  protected limparCampos(): void {
    this.form.reset();
  }

  protected verTodosFilmes(): void {
    void this.router.navigate(['/media', 'movies']);
  }

  protected verTodasSeries(): void {
    void this.router.navigate(['/media', 'series']);
  }

  protected abrirFilme(filme: MovieDto): void {
    const ref = this.dialog.open<
      MediaDetailsDialogComponent,
      MediaDetailsDialogData,
      MediaDetailsDialogResult
    >(MediaDetailsDialogComponent, {
      data: { kind: 'movies', id: filme.id },
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
      MediaDetailsDialogComponent,
      MediaDetailsDialogData,
      MediaDetailsDialogResult
    >(MediaDetailsDialogComponent, {
      data: { kind: 'series', id: serie.id },
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
