import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { MediaKindRegistry } from '../../core/media/media-kind.registry';

const ROTAS_COM_VOLTAR = ['/profiles'];

function deveMostrarVoltar(url: string): boolean {
  const caminho = url.split('?')[0];
  return caminho.startsWith('/media/') || ROTAS_COM_VOLTAR.includes(caminho);
}

/**
 * Shell das telas autenticadas com a sidebar do legado (Inicio + tipos de midia
 * do registry + Perfis) — persistente em todas as telas (decisao da Fase 4).
 * O botao "Voltar" aparece no catalogo (/media/...) e em Perfis, como no legado.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** Tipos de midia do registry (um item de menu por @MediaKind registrado). */
  protected readonly tipos = inject(MediaKindRegistry).entradas();

  protected readonly mostrarVoltar = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => deveMostrarVoltar(event.urlAfterRedirects)),
    ),
    { initialValue: deveMostrarVoltar(this.router.url) },
  );

  protected voltar(): void {
    void this.router.navigate(['/home']);
  }

  protected sair(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
