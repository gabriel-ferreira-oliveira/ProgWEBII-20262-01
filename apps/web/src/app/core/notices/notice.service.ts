import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/**
 * Mensagens ao usuario (equivalente ao JOptionPane do legado).
 * O JOptionPane bloqueava a interacao ate o OK; na web usamos snackbar com
 * fechamento automatico (adaptacao registrada em docs/fase4_frontend.md).
 */
@Injectable({ providedIn: 'root' })
export class NoticeService {
  private readonly snackBar = inject(MatSnackBar);

  info(message: string): void {
    this.snackBar.open(message, 'Fechar', { duration: 3000 });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Fechar', {
      duration: 5000,
      panelClass: 'snackbar-erro',
    });
  }
}
