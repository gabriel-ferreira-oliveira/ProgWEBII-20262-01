import { Component, Injector, OnInit, computed, inject, type ResourceRef } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import type { FormRule } from '@ceviu/shared';
import { MetadataApiService } from '../../core/forms/metadata-api.service';
import type { MediaResumo } from '../../core/media/media-kind';
import type { MediaKindEntry } from '../../core/media/media-kind.registry';
import { MediaKindRegistry } from '../../core/media/media-kind.registry';
import { NoticeService } from '../../core/notices/notice.service';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { MediaDetailsDialogComponent } from '../dialogs/media-details-dialog/media-details-dialog.component';
import type {
  MediaDetailsDialogData,
  MediaDetailsDialogResult,
} from '../dialogs/media-details-dialog/media-details-dialog.component';

/** Quantidade de populares exibida na home (TOTALPRINCIPAL do legado). */
const TOTAL_POPULARES = 4;

/** Formulario publicado pela API para o filtro de pesquisa (`GET /api/metadata/search-catalog`). */
const FORM_PESQUISA = 'search-catalog';

/** Secao "Populares" de um tipo de midia (uma por `@MediaKind` registrado). */
interface SecaoPopular {
  readonly entrada: MediaKindEntry;
  readonly resource: ResourceRef<MediaResumo[] | undefined>;
}

/**
 * Tela Principal (FramePrincipal): painel "Pesquisar" (Nome/ID) e uma secao
 * "Populares" por tipo de midia do registry (4 cards + "Ver mais") — uma secao
 * cobre filmes, series e tipos futuros. Titulo, mensagens, imagens e linhas de
 * card vem do descritor `@MediaKind`.
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
  private readonly metadataApi = inject(MetadataApiService);
  private readonly notices = inject(NoticeService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly registry = inject(MediaKindRegistry);
  private readonly injector = inject(Injector);

  /** Secoes da home: um recurso de lista por tipo registrado. */
  protected readonly secoes: readonly SecaoPopular[] = this.registry.entradas().map((entrada) => ({
    entrada,
    resource: rxResource({ stream: () => this.injector.get(entrada.api).list() }),
  }));

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

  protected populares(secao: SecaoPopular): readonly MediaResumo[] {
    return (secao.resource.value() ?? []).slice(0, TOTAL_POPULARES);
  }

  protected verMais(key: string): void {
    void this.router.navigate(['/media', key]);
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

  protected abrir(secao: SecaoPopular, midia: MediaResumo): void {
    const ref = this.dialog.open<
      MediaDetailsDialogComponent,
      MediaDetailsDialogData,
      MediaDetailsDialogResult
    >(MediaDetailsDialogComponent, {
      data: { kind: secao.entrada.metadados.key, id: midia.id },
      width: '900px',
      maxWidth: '95vw',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.deleted === true) {
        void this.router.navigate(['/home']);
      }
      secao.resource.reload();
    });
  }
}
