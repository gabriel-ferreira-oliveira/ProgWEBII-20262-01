import { Component, computed, input, linkedSignal } from '@angular/core';

const EXTENSION_PATTERN = /\.(png|jpe?g)$/i;

/**
 * Imagem do legado com fallback de extensao e placeholder.
 * Sem extensao no caminho, tenta `.png` e depois `.jpg` (capa do filme 27 — B-02).
 * Se nada carregar, exibe "Sem Imagem" (como o silencio do ImageIcon no legado).
 */
@Component({
  selector: 'app-media-image',
  template: `
    @if (currentSource(); as source) {
      <img
        [src]="source"
        [alt]="alt()"
        [style.width.px]="width()"
        [style.height.px]="height()"
        (error)="handleError()"
      />
    } @else {
      <span class="media-placeholder" [style.min-height.px]="height()">Sem Imagem</span>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    img {
      display: block;
      max-width: 100%;
      object-fit: cover;
    }
  `,
})
export class MediaImageComponent {
  /** Caminho da imagem (ex.: `imagens/filmes/3` ou `imagens/Logo.png`). */
  readonly path = input.required<string>();
  readonly alt = input('');
  readonly width = input<number | null>(null);
  readonly height = input<number | null>(null);

  private readonly attempt = linkedSignal<string, number>({
    source: () => this.path(),
    computation: () => 0,
  });

  private readonly candidates = computed<readonly string[]>(() => {
    const raw = this.path();
    return EXTENSION_PATTERN.test(raw) ? [raw] : [`${raw}.png`, `${raw}.jpg`];
  });

  protected readonly currentSource = computed<string | null>(() => {
    const list = this.candidates();
    const index = this.attempt();
    return index < list.length ? list[index] : null;
  });

  protected handleError(): void {
    this.attempt.update((value) => value + 1);
  }
}
