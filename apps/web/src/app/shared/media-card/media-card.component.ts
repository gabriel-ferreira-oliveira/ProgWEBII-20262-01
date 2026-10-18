import { Component, input, output } from '@angular/core';
import { MediaImageComponent } from '../media-image/media-image.component';

/**
 * Card de catalogo (mesmo desenho do JButton-painel do legado):
 * capa + titulo + linhas de informacao.
 * Sem `actionLabel` o card inteiro e clicavel (listas/perfis/home);
 * com `actionLabel` exibe um botao de acao (tela de resultados — "Ver Detalhes").
 */
@Component({
  selector: 'app-media-card',
  imports: [MediaImageComponent],
  template: `
    @if (actionLabel(); as label) {
      <div class="card-ceviu card-ceviu--estatico">
        <span class="card-ceviu__capa">
          <app-media-image
            [path]="imagePath()"
            [alt]="title()"
            [width]="imageWidth()"
            [height]="imageHeight()"
          />
        </span>
        <span class="card-ceviu__titulo">{{ title() }}</span>
        @for (line of lines(); track $index) {
          <span class="card-ceviu__linha">{{ line }}</span>
        }
        <button type="button" class="btn-ceviu card-ceviu__acao" (click)="select.emit()">
          {{ label }}
        </button>
      </div>
    } @else {
      <button type="button" class="card-ceviu" (click)="select.emit()">
        <span class="card-ceviu__capa">
          <app-media-image
            [path]="imagePath()"
            [alt]="title()"
            [width]="imageWidth()"
            [height]="imageHeight()"
          />
        </span>
        <span class="card-ceviu__titulo">{{ title() }}</span>
        @for (line of lines(); track $index) {
          <span class="card-ceviu__linha">{{ line }}</span>
        }
      </button>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class MediaCardComponent {
  readonly imagePath = input.required<string>();
  readonly imageWidth = input<number | null>(null);
  readonly imageHeight = input(150);
  readonly title = input.required<string>();
  readonly lines = input<readonly string[]>([]);
  /** Rotulo do botao de acao; quando definido o card deixa de ser clicavel. */
  readonly actionLabel = input<string | null>(null);
  readonly select = output<void>();
}
