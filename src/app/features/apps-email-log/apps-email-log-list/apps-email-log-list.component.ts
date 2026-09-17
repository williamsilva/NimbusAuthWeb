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
import { PersistedFilters } from '../../../core/list-base/persisted-filters';
import { STATE_KEY } from '../../../core/state-key.constants';
import { AppsApiService } from '../../apps/apps.api.service';
import { AppModel } from '../../apps/apps.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ActiveFilterItem, FiltersPanelComponent } from '../../../shared/filters-panel/filters-panel.component';
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

  /** Sem StatefulListPage aqui (contrato flat/GET, ver javadoc da classe) - persistência simples
   *  via PersistedFilters direto, mesma ideia (grava só ao clicar Buscar/Limpar). */
  private readonly persistedFilters = new PersistedFilters<AppsEmailLogFiltersState>(STATE_KEY.APPS_EMAIL_LOG.FILTERS.V1);

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

  /** Sem distinção "avançado" vs "coluna" aqui - os p-columnFilter do cabeçalho escrevem direto
   *  nestes MESMOS signals (ver javadoc da classe), então 1 lista só de chips já cobre os dois. */
  readonly activeFilters = computed<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    const recipient = this.recipient().trim();
    const subject = this.subject().trim();
    const eventType = this.eventType().trim();
    const status = this.status();
    const sentAt = this.sentAtRange();

    if (recipient) items.push({ label: this.i18n.tUi('appsEmailLog.list.fields.recipient', 'Destinatário'), value: recipient });
    if (subject) items.push({ label: this.i18n.tUi('appsEmailLog.list.fields.subject', 'Assunto'), value: subject });
    if (eventType) items.push({ label: this.i18n.tUi('appsEmailLog.list.fields.eventType', 'Tipo de evento'), value: eventType });
    if (status) items.push({ label: this.i18n.tUi('appsEmailLog.list.fields.status', 'Status'), value: this.statusLabel(status) });

    if (sentAt?.[0] && sentAt?.[1]) {
      items.push({
        label: this.i18n.tUi('appsEmailLog.list.fields.sentAt', 'Enviado em'),
        value: `${this.formatDate(sentAt[0])} – ${this.formatDate(sentAt[1])}`,
      });
    }

    return items;
  });

  readonly activeFiltersCount = computed(() => this.activeFilters().length);

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
        // query param (deep link de outro app) tem prioridade sobre o filtro persistido.
        if (!this.preselectFromQueryParamIfPresent()) {
          this.restorePersistedFilters();
        }
      },
      error: () => this.loadingApps.set(false),
    });
  }

  private preselectFromQueryParamIfPresent(): boolean {
    const appKey = this.route.snapshot.queryParamMap.get('appKey');
    if (!appKey) return false;
    const row = this.apps().find((app) => app.appKey === appKey);
    if (!row) return false;
    this.onAppChange(row.appKey);
    return true;
  }

  private restorePersistedFilters(): void {
    const state = this.persistedFilters.load();
    if (!state) return;

    this.recipient.set(state.recipient ?? '');
    this.subject.set(state.subject ?? '');
    this.eventType.set(state.eventType ?? '');
    this.status.set(state.status ?? null);
    this.sentAtRange.set(
      state.sentAtRange?.[0] && state.sentAtRange?.[1] ? [new Date(state.sentAtRange[0]), new Date(state.sentAtRange[1])] : null,
    );

    const appKey = state.appKey;
    if (appKey && this.apps().some((app) => app.appKey === appKey)) {
      this.onAppChange(appKey);
    }
  }

  private persistCurrentFilters(): void {
    const sentAt = this.sentAtRange();
    this.persistedFilters.save({
      appKey: this.selectedAppKey(),
      recipient: this.recipient(),
      subject: this.subject(),
      eventType: this.eventType(),
      status: this.status(),
      sentAtRange: sentAt?.[0] && sentAt?.[1] ? [sentAt[0].toISOString(), sentAt[1].toISOString()] : null,
    });
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

    this.persistCurrentFilters();

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

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(value);
  }
}

interface AppsEmailLogFiltersState {
  appKey: string | null;
  recipient: string;
  subject: string;
  eventType: string;
  status: string | null;
  sentAtRange: [string, string] | null;
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
