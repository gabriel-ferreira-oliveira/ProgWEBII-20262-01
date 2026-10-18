import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { SeriesDto } from '@ceviu/shared';
import { SeriesApiService } from '../../core/api/series-api.service';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { chunkRows } from '../../shared/utils/chunk-rows';
import { caminhoImagemSerie, formatNumber, formatText } from '../../shared/utils/format';
import { SeriesDetailsDialogComponent } from '../dialogs/series-details-dialog/series-details-dialog.component';
import type {
  MediaDetailsDialogResult,
  SeriesDetailsDialogData,
} from '../dialogs/series-details-dialog/series-details-dialog.component';

/** Series por linha (SERIES_POR_LINHA do legado). */
const SERIES_POR_LINHA = 3;

/** Tela "Todas as Series" (FrameSerie): grade 3 por linha com rolagem. */
@Component({
  selector: 'app-series-list',
  imports: [MatProgressBarModule, MediaCardComponent],
  templateUrl: './series-list.component.html',
  styleUrl: './series-list.component.scss',
})
export class SeriesListComponent {
  private readonly seriesApi = inject(SeriesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly series = rxResource({ stream: () => this.seriesApi.list() });
  protected readonly linhas = computed(() =>
    chunkRows(this.series.value() ?? [], SERIES_POR_LINHA),
  );

  protected caminhoImagem(id: number): string {
    return caminhoImagemSerie(id);
  }

  protected linhasSerie(serie: SeriesDto): string[] {
    return [`Ano: ${formatNumber(serie.year)}`, `Gênero: ${formatText(serie.genre)}`];
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
      this.series.reload();
    });
  }
}
