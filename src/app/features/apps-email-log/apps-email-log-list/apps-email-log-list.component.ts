import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { SortEvent } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule, TablePageEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { buildListQuery } from '../../../core/list-base/list-query.builder';
import { AppsApiService } from '../../apps/apps.api.service';
import { AppModel } from '../../apps/apps.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FiltersPanelComponent } from '../../../shared/filters-panel/filters-panel.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { eventTypeCode } from '../../email-log/email-log-status';
import { EmailLogApiService } from '../../email-log/email-log.api.service';
import { EmailLogAdvancedFilters, EmailLogModel } from '../../email-log/email-log.models';
import { AppsEmailLogApiService } from '../apps-email-log.api.service';
import { AppEmailLogItem } from '../apps-email-log.models';

/** Painel central de Auditoria de E-mail - fundiu as telas "Auditoria de E-mail" (só o próprio
 *  NimbusAuth) e "Auditoria dos Apps" (proxy pros 4 satélites) numa só, com "NimbusAuth" como mais
 *  uma opção no MESMO seletor de app (ver loadApps()). Selecionar um satélite chama o proxy
 *  (AppsEmailLogApiService, GET flat/query-string); selecionar "NimbusAuth" chama o endpoint
 *  próprio (EmailLogApiService, POST ListQueryDto) com um adaptador pequeno traduzindo request/
 *  response pro mesmo shape AppEmailLogItem (ver toAppEmailLogItem()) - os satélites têm eventType
 *  livre/divergente, por isso os filtros aqui continuam deliberadamente simples (texto livre +
 *  status fixo SENT/FAILED + período + 1 sort por vez), sem StatefulListPage. */
@Component({
  standalone: true,
  selector: 'app-apps-email-log-list',
  templateUrl: './apps-email-log-list.component.html',
  imports: [
    ButtonModule,
    DatePickerModule,
    DatePipe,
    DialogModule,
    FiltersPanelComponent,
    FloatLabel,
    FormsModule,
    InputTextModule,
    PageHeaderComponent,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    TranslateModule,
  ],
})
export class AppsEmailLogListComponent implements OnInit {
  private readonly appsApi = inject(AppsApiService);
  private readonly api = inject(AppsEmailLogApiService);
  private readonly emailLogApi = inject(EmailLogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);
  private readonly sanitizer = inject(DomSanitizer);

  /** appKey sintético - não existe de verdade como "satélite" (é o próprio NimbusAuth), mas
   *  aparece como qualquer outro no seletor (ver loadApps()). */
  private static readonly NIMBUS_AUTH_APP_KEY = 'nimbusauth';

  readonly statusOptions = computed(() => {
    this.i18n.appliedLang();
    return [
      { label: this.i18n.tUi('emailLog.status.sent', 'Enviado'), value: 'SENT' },
      { label: this.i18n.tUi('emailLog.status.failed', 'Falhou'), value: 'FAILED' },
    ];
  });

  readonly loadingApps = signal(true);
  readonly apps = signal<AppModel[]>([]);
  readonly selectedAppKey = signal<string | null>(null);

  readonly recipient = signal('');
  readonly subject = signal('');
  readonly eventType = signal('');
  readonly status = signal<string | null>(null);
  readonly sentAtRange = signal<Date[] | null>(null);
  readonly sortField = signal<string | null>(null);
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  readonly items = signal<AppEmailLogItem[]>([]);
  readonly totalRecords = signal(0);
  readonly rows = 20;
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);

  readonly detailVisible = signal(false);
  readonly detailLog = signal<AppEmailLogItem | null>(null);
  readonly detailBodySafe = computed<SafeHtml | null>(() => {
    const body = this.detailLog()?.body;
    return body ? this.sanitizer.bypassSecurityTrustHtml(body) : null;
  });

  ngOnInit(): void {
    this.loadApps();
  }

  private loadApps(): void {
    this.loadingApps.set(true);
    this.appsApi.search('', 0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.apps.set(result._embedded?.content ?? []);
        this.loadingApps.set(false);
        this.preselectFromQueryParamIfPresent();
      },
      error: () => this.loadingApps.set(false),
    });
  }

  private preselectFromQueryParamIfPresent(): void {
    const appKey = this.route.snapshot.queryParamMap.get('appKey');
    if (!appKey) return;
    const row = this.apps().find((app) => app.appKey === appKey);
    if (row) this.onAppChange(row.appKey);
  }

  onAppChange(appKey: string | null): void {
    this.selectedAppKey.set(appKey);
    this.items.set([]);
    this.totalRecords.set(0);
    this.loadedOnce.set(false);
    if (appKey) this.search(0);
  }

  search(page = 0): void {
    const appKey = this.selectedAppKey();
    if (!appKey) return;

    if (appKey === AppsEmailLogListComponent.NIMBUS_AUTH_APP_KEY) {
      this.searchNimbusAuth(page);
      return;
    }
    this.searchSatellite(appKey, page);
  }

  private searchSatellite(appKey: string, page: number): void {
    const sentAt = this.sentAtRange();

    this.loading.set(true);
    this.api
      .search(appKey, {
        page,
        size: this.rows,
        recipient: this.recipient().trim() || undefined,
        subject: this.subject().trim() || undefined,
        eventType: this.eventType().trim() || undefined,
        status: this.status() ?? undefined,
        sentAtFrom: sentAt?.[0] ? sentAt[0].toISOString() : undefined,
        sentAtTo: sentAt?.[1] ? sentAt[1].toISOString() : undefined,
        sortField: this.sortField() ?? undefined,
        sortOrder: this.sortOrder(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.content);
          this.totalRecords.set(result.totalElements);
          this.loading.set(false);
          this.loadedOnce.set(true);
        },
        error: () => {
          this.loading.set(false);
          this.loadedOnce.set(true);
        },
      });
  }

  /** NimbusAuth não é um satélite de verdade - usa o endpoint próprio (POST ListQueryDto, já
   *  usado antes pela tela /email-log removida), adaptado pro mesmo shape AppEmailLogItem. */
  private searchNimbusAuth(page: number): void {
    const sentAt = this.sentAtRange();
    const eventType = this.eventType().trim();
    const status = this.status();

    const tableQuery = {
      page,
      size: this.rows,
      sort: this.sortField() ? [{ field: this.sortField()!, order: this.sortOrder() === 'asc' ? 1 : -1 }] : [],
      tableFilters: {},
      globalFilter: null,
    };
    const advanced: EmailLogAdvancedFilters = {
      recipient: this.recipient().trim() || undefined,
      subject: this.subject().trim() || undefined,
      eventType: eventType ? [eventType.toUpperCase()] : undefined,
      status: status ? [status] : undefined,
      sentAtFrom: sentAt?.[0] ? sentAt[0].toISOString() : undefined,
      sentAtTo: sentAt?.[1] ? sentAt[1].toISOString() : undefined,
    };
    const query = buildListQuery<EmailLogAdvancedFilters>(tableQuery, advanced);

    this.loading.set(true);
    this.emailLogApi
      .search(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          const content = result._embedded?.content ?? [];
          this.items.set(content.map(toAppEmailLogItem));
          this.totalRecords.set(result.page.totalElements);
          this.loading.set(false);
          this.loadedOnce.set(true);
        },
        error: () => {
          this.loading.set(false);
          this.loadedOnce.set(true);
        },
      });
  }

  clear(): void {
    this.recipient.set('');
    this.subject.set('');
    this.eventType.set('');
    this.status.set(null);
    this.sentAtRange.set(null);
    this.sortField.set(null);
    this.sortOrder.set('desc');
    this.search(0);
  }

  onPageChange(event: TablePageEvent): void {
    this.search(event.first / event.rows);
  }

  viewDetail(row: AppEmailLogItem): void {
    this.detailLog.set(row);
    this.detailVisible.set(true);
  }

  onDetailVisibleChange(visible: boolean): void {
    this.detailVisible.set(visible);
    if (!visible) this.detailLog.set(null);
  }

  /** `[customSort]="true"` no p-table - PrimeNG só atualiza a seta do `p-sortIcon` e emite este
   *  evento, sem tentar ordenar `[value]` no cliente (o proxy só suporta 1 sortField por vez, não
   *  "multiple", ver AppEmailLogController). */
  onSort(event: SortEvent): void {
    this.sortField.set(event.field ?? null);
    this.sortOrder.set(event.order === 1 ? 'asc' : 'desc');
    this.search(0);
  }

  statusSeverity(status: string | null): 'success' | 'danger' | 'secondary' {
    if (status === 'SENT') return 'success';
    if (status === 'FAILED') return 'danger';
    return 'secondary';
  }

  /** Rótulo traduzido - vale pra qualquer app (SENT/FAILED é o mesmo vocabulário nos 5). */
  statusLabel(status: string | null): string {
    const option = this.statusOptions().find((o) => o.value === status);
    return option?.label ?? status ?? '-';
  }

  /** Só o NimbusAuth tem um catálogo fixo de eventType (os satélites são texto livre/divergente,
   *  sem dicionário - mostrado cru, como já era). */
  eventTypeLabel(row: AppEmailLogItem): string {
    if (this.selectedAppKey() !== AppsEmailLogListComponent.NIMBUS_AUTH_APP_KEY || !row.eventType) {
      return row.eventType ?? '-';
    }

    const code = eventTypeCode(row.eventType);
    switch (code) {
      case 1:
        return this.i18n.tUi('emailLog.eventType.passwordReset', 'Reset de senha');
      case 2:
        return this.i18n.tUi('emailLog.eventType.firstAccess', 'Primeiro acesso');
      case 3:
        return this.i18n.tUi('emailLog.eventType.chargebackDetected', 'Chargeback detectado');
      case 4:
        return this.i18n.tUi('emailLog.eventType.backupNotification', 'Notificação de backup');
      default:
        return row.eventType;
    }
  }
}

/** EmailLogModel (NimbusAuth, recipient singular) -> AppEmailLogItem (recipients plural) - mesmo
 *  shape usado pela tabela unificada, pro proxy dos satélites e pro NimbusAuth caírem na mesma
 *  renderização. */
function toAppEmailLogItem(model: EmailLogModel): AppEmailLogItem {
  return {
    recipients: model.recipient,
    subject: model.subject,
    template: model.template,
    status: model.status,
    eventType: model.eventType,
    errorMessage: model.errorMessage,
    sentAt: model.sentAt,
    body: model.body,
  };
}
