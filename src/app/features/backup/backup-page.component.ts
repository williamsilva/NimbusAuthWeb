import { DatePipe } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { environment } from '../../../environments/environment';
import { I18nService } from '../../core/i18n/i18n.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { AppsApiService } from '../apps/apps.api.service';
import { AppModel } from '../apps/apps.models';
import { BackupApiService } from './backup.api.service';
import { formatBytes, statusSeverity } from './backup-status';
import { BackupExecution, BackupNotificationRecipient, GoogleDriveStatus } from './backup.models';

/** Tela única (não é lista CRUD) - status da conexão com o Google Drive, disparo manual do
 *  backup centralizado, backup avulso de 1 app só e histórico das últimas execuções. O disparo
 *  consolidado é assíncrono no backend (BackupAsyncExecutor) - por isso o polling automático
 *  enquanto houver uma execução RUNNING, pra não obrigar o usuário a ficar clicando "Atualizar"
 *  pra ver o resultado. Já o backup avulso (BackupController.executeSingle) é síncrono - baixa
 *  na hora, não entra no histórico de execuções (não é agendado nem consolidado). */
@Component({
  standalone: true,
  selector: 'app-backup-page',
  templateUrl: './backup-page.component.html',
  styleUrl: './backup-page.component.scss',
  imports: [
    ButtonModule,
    CardModule,
    CheckboxModule,
    ConfirmDialogModule,
    DatePipe,
    FormsModule,
    InputTextModule,
    PageHeaderComponent,
    SelectModule,
    TableModule,
    TabsModule,
    TagModule,
    TooltipModule,
    TranslateModule,
  ],
  providers: [ConfirmationService],
})
export class BackupPageComponent implements OnInit {
  private readonly api = inject(BackupApiService);
  private readonly appsApi = inject(AppsApiService);
  private readonly toast = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly statusSeverity = statusSeverity;
  protected readonly formatBytes = formatBytes;

  protected statusLabel(status: BackupExecution['status'] | null | undefined): string {
    const key: Record<string, string> = {
      RUNNING: 'backup.status.running',
      SUCCESS: 'backup.status.success',
      PARTIAL: 'backup.status.partial',
      FAILED: 'backup.status.failed',
    };
    const fallback: Record<string, string> = {
      RUNNING: 'Em execução',
      SUCCESS: 'Concluído',
      PARTIAL: 'Concluído com alertas',
      FAILED: 'Falhou',
    };
    if (status && key[status]) return this.i18n.tUi(key[status], fallback[status]);
    return this.i18n.tUi('backup.status.unknown', 'Desconhecido');
  }

  readonly loadingStatus = signal(true);
  readonly loadingExecutions = signal(true);
  readonly executing = signal(false);
  readonly driveStatus = signal<GoogleDriveStatus | null>(null);
  readonly executions = signal<BackupExecution[]>([]);

  readonly loadingRecipients = signal(true);
  readonly savingRecipient = signal(false);
  readonly recipients = signal<BackupNotificationRecipient[]>([]);
  readonly newRecipientEmail = signal('');

  readonly loadingApps = signal(true);
  readonly apps = signal<AppModel[]>([]);
  readonly selectedAppKey = signal<string | null>(null);
  readonly includeFiles = signal(true);
  readonly generatingSingle = signal(false);

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
    this.loadApps();
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
      this.toast.add({
        severity: 'success',
        summary: this.i18n.tUi('backup.toastDriveConnected.summary', 'Google Drive conectado'),
        detail: this.i18n.tUi('backup.toastDriveConnected.detail', 'A conta foi conectada com sucesso.'),
      });
    } else if (disconnected === 'true') {
      this.toast.add({
        severity: 'success',
        summary: this.i18n.tUi('backup.toastDriveDisconnected.summary', 'Google Drive desconectado'),
        detail: this.i18n.tUi('backup.toastDriveDisconnected.detail', 'A conta foi desconectada.'),
      });
    } else if (error) {
      this.toast.add({
        severity: 'error',
        summary: this.i18n.tUi('backup.toastDriveError.summary', 'Falha na conexão'),
        detail: this.describeGoogleDriveError(error),
      });
    }

    if (connected || disconnected || error) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  private describeGoogleDriveError(code: string): string {
    switch (code) {
      case 'not_configured':
        return this.i18n.tUi('backup.driveErrors.notConfigured', 'O cliente OAuth2 do Google Drive não está configurado neste ambiente.');
      case 'state_mismatch':
        return this.i18n.tUi('backup.driveErrors.stateMismatch', 'Estado inválido ou expirado - tente conectar de novo.');
      case 'token_exchange_failed':
        return this.i18n.tUi('backup.driveErrors.tokenExchangeFailed', 'Falha ao trocar o código de autorização por um token - tente novamente.');
      default:
        return this.i18n.tUi('backup.driveErrors.generic', { code }, `Erro ao conectar: ${code}`);
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
      header: this.i18n.tUi('backup.confirmDisconnect.header', 'Desconectar Google Drive'),
      message: this.i18n.tUi('backup.confirmDisconnect.message', 'Os backups automáticos vão parar de ser enviados até reconectar. Continuar?'),
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
            summary: this.i18n.tUi('backup.toastBackupStarted.summary', 'Backup iniciado'),
            detail: this.i18n.tUi('backup.toastBackupStarted.detail', 'A execução foi disparada em segundo plano - acompanhe o status abaixo.'),
          });
          this.loadExecutions();
        },
        error: () => {
          this.executing.set(false);
          this.toast.add({
            severity: 'error',
            summary: this.i18n.tUi('backup.toastBackupError.summary', 'Erro'),
            detail: this.i18n.tUi('backup.toastBackupError.detail', 'Não foi possível disparar o backup.'),
          });
        },
      });
  }

  protected refresh(): void {
    this.loadExecutions();
  }

  protected triggeredByLabel(triggeredBy: string | null): string {
    if (triggeredBy === 'scheduled') {
      return this.i18n.tUi('backup.history.triggeredByScheduled', 'Agendado');
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
          this.toast.add({ severity: 'success', summary: this.i18n.tUi('backup.toastRecipientAdded.summary', 'Destinatário adicionado'), detail: email });
          this.loadRecipients();
        },
        error: (err) => {
          this.savingRecipient.set(false);
          this.toast.add({
            severity: 'error',
            summary: this.i18n.tUi('backup.toastRecipientError.summary', 'Erro'),
            detail: err?.error?.message || this.i18n.tUi('backup.toastRecipientError.detailFallback', 'Não foi possível adicionar o destinatário.'),
          });
        },
      });
  }

  private loadApps(): void {
    this.loadingApps.set(true);
    this.appsApi
      .search('', 0, 100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          const content = result._embedded?.content ?? [];
          this.apps.set(content.filter((app) => app.appKey !== 'nimbusauth'));
          this.loadingApps.set(false);
        },
        error: () => this.loadingApps.set(false),
      });
  }

  protected generateSingle(): void {
    const appKey = this.selectedAppKey();
    if (!appKey) {
      return;
    }

    this.generatingSingle.set(true);
    this.api
      .executeSingle(appKey, this.includeFiles())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.generatingSingle.set(false);
          this.downloadBlob(response, `backup-${appKey}.zip`);
        },
        error: () => {
          this.generatingSingle.set(false);
          this.toast.add({
            severity: 'error',
            summary: this.i18n.tUi('backup.toastSingleError.summary', 'Erro'),
            detail: this.i18n.tUi('backup.toastSingleError.detail', 'Não foi possível gerar o backup deste app.'),
          });
        },
      });
  }

  private downloadBlob(response: HttpResponse<Blob>, fallbackFilename: string): void {
    const blob = response.body;
    if (!blob) return;

    const contentDisposition = response.headers.get('Content-Disposition') ?? '';
    const filenameMatch = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    const filename = filenameMatch?.[1] ?? fallbackFilename;

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected removeRecipient(recipient: BackupNotificationRecipient): void {
    this.confirmationService.confirm({
      header: this.i18n.tUi('backup.confirmRemoveRecipient.header', 'Remover destinatário'),
      message: this.i18n.tUi(
        'backup.confirmRemoveRecipient.message',
        { email: recipient.email },
        `Remover "${recipient.email}" da lista de notificações de backup?`,
      ),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api
          .deleteNotificationRecipient(recipient.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: this.i18n.tUi('backup.toastRemoved.summary', 'Removido'), detail: recipient.email });
              this.loadRecipients();
            },
            error: () => {
              this.toast.add({
                severity: 'error',
                summary: this.i18n.tUi('backup.toastRemoveError.summary', 'Erro'),
                detail: this.i18n.tUi('backup.toastRemoveError.detail', 'Não foi possível remover o destinatário.'),
              });
            },
          });
      },
    });
  }
}
