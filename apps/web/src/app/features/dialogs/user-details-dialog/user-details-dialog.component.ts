import { Component, Inject, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { rxResource } from '@angular/core/rxjs-interop';
import type { FavoriteEntryDto, UserDetailDto, WatchedEntryDto } from '@ceviu/shared';
import { forkJoin } from 'rxjs';
import { UsersApiService } from '../../../core/api/users-api.service';
import { LEGACY_MESSAGES } from '../../../core/legacy-messages';
import { MediaImageComponent } from '../../../shared/media-image/media-image.component';
import { CAMINHO_AVATAR } from '../../../shared/utils/format';

export interface UserDetailsDialogData {
  readonly userId: number;
}

interface UserDetailsBundle {
  readonly detail: UserDetailDto;
  readonly favorites: readonly FavoriteEntryDto[];
  readonly watchedSeries: readonly WatchedEntryDto[];
  readonly watchedMovies: readonly WatchedEntryDto[];
}

/**
 * Modal "Detalhes do Usuario" (DetalhesUsuario no legado):
 * perfil + Favoritos + Series assistidas + Filmes assistidos (ordem e duplicatas preservadas).
 * Listas vazias exibem "Nenhum item favorito encontrado." (texto unico do legado nas 3 secoes).
 * Sem botao Voltar (B-07 aprovado na Fase 4).
 */
@Component({
  selector: 'app-user-details-dialog',
  imports: [MatDialogModule, MatProgressBarModule, MediaImageComponent],
  templateUrl: './user-details-dialog.component.html',
  styleUrl: './user-details-dialog.component.scss',
})
export class UserDetailsDialogComponent {
  private readonly usersApi = inject(UsersApiService);

  protected readonly listaVazia = LEGACY_MESSAGES.listaVazia;
  protected readonly avatar = CAMINHO_AVATAR;

  protected readonly perfil = rxResource({
    stream: () => {
      const id = this.data.userId;
      return forkJoin({
        detail: this.usersApi.detail(id),
        favorites: this.usersApi.favorites(id),
        watchedSeries: this.usersApi.watchedSeries(id),
        watchedMovies: this.usersApi.watchedMovies(id),
      });
    },
  });

  constructor(@Inject(MAT_DIALOG_DATA) protected readonly data: UserDetailsDialogData) {}

  protected recarregar(): void {
    this.perfil.reload();
  }
}
