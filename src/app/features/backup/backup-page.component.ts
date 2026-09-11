import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FieldsetModule } from 'primeng/fieldset';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { environment } from '../../../environments/environment';
import { BackupApiService } from './backup.api.service';
import { formatBytes, statusLabel, statusSeverity } from './backup-status';
import { BackupExecution, BackupNotificationRecipient, GoogleDriveStatus } from './backup.models';

/** Tela única (não é lista CRUD) - status da conexão com o Google Drive, disparo manual do
 *  backup centralizado e histórico das últimas execuções. O disparo é assíncrono no backend
 *  (BackupAsyncExecutor) - por isso o polling automático enquanto houver uma execução RUNNING,
 *  pra não obrigar o usuário a ficar clicando "Atualizar" pra ver o resultado. */
@Component({
  standalone: true,
  selector: 'app-backup-page',
  templateUrl: './backup-page.component.html',
  styleUrl: './backup-page.component.scss',
  imports: [ButtonModule, ConfirmDialogModule, DatePipe, FieldsetModule, FormsModule, InputTextModule, TableModule, TagModule],
  providers: [ConfirmationService],
})
export class BackupPageComponent implements OnInit {
  private readonly api = inject(BackupApiService);
  private readonly toast = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly statusLabel = statusLabel;
  protected readonly statusSeverity = statusSeverity;
  protected readonly formatBytes = formatBytes;

  readonly loadingStatus = signal(true);
  readonly loadingExecutions = signal(true);
  readonly executing = signal(false);
  readonly driveStatus = signal<GoogleDriveStatus | null>(null);
  readonly executions = signal<BackupExecution[]>([]);

  readonly loadingRecipients = signal(true);
  readonly savingRecipient = signal(false);
  readonly recipients = signal<BackupNotificationRecipient[]>([]);
  readonly newRecipientEmail = signal('');

  private pollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.pollTimeout) {
        clearTimeout(this.pollTimeout);
      }
    });
  }

  ngOnInit(): void {
    this.handleGoogleDriveCallback();
    this.loadDriveStatus();
    this.loadExecutions();
    this.loadRecipients();
  }

  // O redirect de volta de /backup/google-drive/{connect,disconnect} traz o resultado como
  // query param (ver BackupGoogleDriveController) - lê uma vez e limpa da URL, pra não
  // reprocessar o toast num F5.
  private handleGoogleDriveCallback(): void {
    const params = this.route.snapshot.queryParamMap;
    const connected = params.get('google_drive_connected');
    const disconnected = params.get('google_drive_disconnected');
    const error = params.get('google_drive_error');

    if (connected === 'true') {
      this.toast.add({ severity: 'success', summary: 'Google Drive conectado', detail: 'A conta foi conectada com sucesso.' });
    } else if (disconnected === 'true') {
      this.toast.add({ severity: 'success', summary: 'Google Drive desconectado', detail: 'A conta foi desconectada.' });
    } else if (error) {
      this.toast.add({ severity: 'error', summary: 'Falha na conexão', detail: this.describeGoogleDriveError(error) });
    }

    if (connected || disconnected || error) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  private describeGoogleDriveError(code: string): string {
    switch (code) {
      case 'not_configured':
        return 'O cliente OAuth2 do Google Drive não está configurado neste ambiente.';
      case 'state_mismatch':
        return 'Estado inválido ou expirado - tente conectar de novo.';
      case 'token_exchange_failed':
        return 'Falha ao trocar o código de autorização por um token - tente novamente.';
      default:
        return `Erro ao conectar: ${code}`;
    }
  }

  private loadDriveStatus(): void {
    this.loadingStatus.set(true);
    this.api
      .googleDriveStatus()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.driveStatus.set(status);
          this.loadingStatus.set(false);
        },
        error: () => this.loadingStatus.set(false),
      });
  }

  private loadExecutions(): void {
    this.loadingExecutions.set(true);
    this.api
      .executions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.executions.set(list);
          this.loadingExecutions.set(false);
          this.scheduleAutoRefreshIfRunning(list);
        },
        error: () => this.loadingExecutions.set(false),
      });
  }

  private scheduleAutoRefreshIfRunning(list: BackupExecution[]): void {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    const hasRunning = list.some((execution) => execution.status === 'RUNNING');
    if (hasRunning) {
      this.pollTimeout = setTimeout(() => this.loadExecutions(), 5000);
    }
  }

  protected connectGoogleDrive(): void {
    window.location.assign(new URL('/backup/google-drive/connect', environment.apiBaseUrl).toString());
  }

  protected disconnectGoogleDrive(): void {
    this.confirmationService.confirm({
      header: 'Desconectar Google Drive',
      message: 'Os backups automáticos vão parar de ser enviados até reconectar. Continuar?',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        window.location.assign(new URL('/backup/google-drive/disconnect', environment.apiBaseUrl).toString());
      },
    });
  }

  protected executeNow(): void {
    this.executing.set(true);
    this.api
      .execute()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.executing.set(false);
          this.toast.add({
            severity: 'success',
            summary: 'Backup iniciado',
            detail: 'A execução foi disparada em segundo plano - acompanhe o status abaixo.',
          });
          this.loadExecutions();
        },
        error: () => {
          this.executing.set(false);
          this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível disparar o backup.' });
        },
      });
  }

  protected refresh(): void {
    this.loadExecutions();
  }

  protected triggeredByLabel(triggeredBy: string | null): string {
    if (triggeredBy === 'scheduled') {
      return 'Agendado';
    }
    return triggeredBy || '-';
  }

  private loadRecipients(): void {
    this.loadingRecipients.set(true);
    this.api
      .notificationRecipients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.recipients.set(list);
          this.loadingRecipients.set(false);
        },
        error: () => this.loadingRecipients.set(false),
      });
  }

  protected addRecipient(): void {
    const email = this.newRecipientEmail().trim();
    if (!email) {
      return;
    }

    this.savingRecipient.set(true);
    this.api
      .addNotificationRecipient(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingRecipient.set(false);
          this.newRecipientEmail.set('');
          this.toast.add({ severity: 'success', summary: 'Destinatário adicionado', detail: email });
          this.loadRecipients();
        },
        error: (err) => {
          this.savingRecipient.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Erro',
            detail: err?.error?.message || 'Não foi possível adicionar o destinatário.',
          });
        },
      });
  }

  protected removeRecipient(recipient: BackupNotificationRecipient): void {
    this.confirmationService.confirm({
      header: 'Remover destinatário',
      message: `Remover "${recipient.email}" da lista de notificações de backup?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api
          .deleteNotificationRecipient(recipient.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Removido', detail: recipient.email });
              this.loadRecipients();
            },
            error: () => {
              this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível remover o destinatário.' });
            },
          });
      },
    });
  }
}
