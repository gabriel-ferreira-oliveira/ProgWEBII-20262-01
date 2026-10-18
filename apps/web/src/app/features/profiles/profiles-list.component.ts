import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { UserSummaryDto } from '@ceviu/shared';
import { UsersApiService } from '../../core/api/users-api.service';
import { MediaCardComponent } from '../../shared/media-card/media-card.component';
import { chunkRows } from '../../shared/utils/chunk-rows';
import { CAMINHO_AVATAR } from '../../shared/utils/format';
import { UserDetailsDialogComponent } from '../dialogs/user-details-dialog/user-details-dialog.component';
import type { UserDetailsDialogData } from '../dialogs/user-details-dialog/user-details-dialog.component';

/** Perfis por linha (PERFIS_POR_LINHA do legado). */
const PERFIS_POR_LINHA = 3;

/** Tela "Todos os Perfis" (FramePerfil): cartoes de usuario com avatar e idade. */
@Component({
  selector: 'app-profiles-list',
  imports: [MatProgressBarModule, MediaCardComponent],
  templateUrl: './profiles-list.component.html',
  styleUrl: './profiles-list.component.scss',
})
export class ProfilesListComponent {
  private readonly usersApi = inject(UsersApiService);
  private readonly dialog = inject(MatDialog);

  protected readonly avatar = CAMINHO_AVATAR;
  protected readonly perfis = rxResource({ stream: () => this.usersApi.list() });
  protected readonly linhas = computed(() =>
    chunkRows(this.perfis.value() ?? [], PERFIS_POR_LINHA),
  );

  protected linhasPerfil(perfil: UserSummaryDto): string[] {
    return [`Idade: ${perfil.age === null ? '-' : perfil.age}`];
  }

  protected abrirPerfil(perfil: UserSummaryDto): void {
    this.dialog.open<UserDetailsDialogComponent, UserDetailsDialogData>(
      UserDetailsDialogComponent,
      {
        data: { userId: perfil.id },
        width: '900px',
        maxWidth: '95vw',
        autoFocus: false,
      },
    );
  }
}
