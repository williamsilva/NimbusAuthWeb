import { Component, EventEmitter, Output, inject, input } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';

import { AppSecretModel } from '../apps.models';

/** Mostra o client secret em claro UMA ÚNICA vez (create/regenerate-secret) - ver
 *  AppsController#create/regenerateSecret. Fechar este diálogo é definitivo: o valor não pode
 *  ser recuperado de novo, só regenerado (o que invalida este na hora). */
@Component({
  standalone: true,
  selector: 'app-apps-secret-dialog',
  templateUrl: './apps-secret-dialog.component.html',
  imports: [ButtonModule, DialogModule, InputTextModule],
})
export class AppsSecretDialogComponent {
  secret = input<AppSecretModel | null>(null);

  @Output() closed = new EventEmitter<void>();

  private readonly toast = inject(MessageService);

  async copy(): Promise<void> {
    const value = this.secret()?.clientSecret;
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      this.toast.add({ severity: 'success', summary: 'Copiado', detail: 'Client secret copiado.' });
    } catch {
      this.toast.add({ severity: 'warn', summary: 'Não copiado', detail: 'Selecione e copie manualmente.' });
    }
  }

  close(): void {
    this.closed.emit();
  }
}
