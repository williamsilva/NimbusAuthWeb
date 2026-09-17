import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { buildListQuery } from '../../../core/list-base/list-query.builder';
import { readArrayFilterValues, readDateRangeFilterValue, readSingleFilterValue } from '../../../core/list-base/table-filter-readers';
import { StatefulListPage } from '../../../core/list-base/stateful-list-page';
import { STATE_KEY } from '../../../core/state-key.constants';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ActiveFilterItem, FiltersPanelComponent } from '../../../shared/filters-panel/filters-panel.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import {
  eventTypeCode,
  eventTypeName,
  statusCode,
  statusName,
  statusSeverity,
} from '../email-log-status';
import { EmailLogApiService } from '../email-log.api.service';
import { EmailLogAdvancedFilters, EmailLogFiltersState, EmailLogModel } from '../email-log.models';

/** Tela de Auditoria de E-mail - lista os e-mails de convite de primeiro acesso e reset de senha
 *  disparados pelo próprio NimbusAuthServer, no mesmo padrão de lista avançada já usado em
 *  Usuários/Grupos (StatefulListPage + cs-filters-panel + p-columnFilter por coluna, ver
 *  core/list-base). Só leitura - não existe endpoint de reenvio nem de edição. */
@Component({
  standalone: true,
  selector: 'app-email-log-list',
  templateUrl: './email-log-list.component.html',
  imports: [
    ButtonModule,
    DatePickerModule,
    DatePipe,
    DialogModule,
    FiltersPanelComponent,
    FloatLabel,
    FormsModule,
    InputTextModule,
    MultiSelectModule,
    PageHeaderComponent,
    TableModule,
    TagModule,
    TooltipModule,
    TranslateModule,
  ],
})
export class EmailLogListComponent extends StatefulListPage<EmailLogFiltersState, EmailLogAdvancedFilters> implements OnInit {
  @ViewChild('dt') private dt?: Table;

  private readonly api = inject(EmailLogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(I18nService);

  override rows = Number(localStorage.getItem(this.tableRowsKey())) || StatefulListPage.DEFAULT_ROWS;

  readonly logs = signal<EmailLogModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);

  readonly subject = signal('');
  readonly template = signal('');
  readonly recipient = signal('');
  readonly status = signal<number[] | null>(null);
  readonly eventType = signal<number[] | null>(null);
  readonly sentAtRange = signal<Date[] | null>(null);

  /** Só os eventos que o NimbusAuthServer de fato gera (convite de 1º acesso, reset de senha,
   *  notificação de backup). Computed (não array fixo) - labels reavaliam quando o idioma muda. */
  readonly statusOptions = computed(() => {
    this.i18n.appliedLang();
    return [
      { label: this.i18n.tUi('emailLog.status.sent', 'Enviado'), value: 1 },
      { label: this.i18n.tUi('emailLog.status.failed', 'Falhou'), value: 2 },
    ];
  });

  readonly eventTypeOptions = computed(() => {
    this.i18n.appliedLang();
    return [
      { label: this.i18n.tUi('emailLog.eventType.passwordReset', 'Reset de senha'), value: 1 },
      { label: this.i18n.tUi('emailLog.eventType.firstAccess', 'Primeiro acesso'), value: 2 },
      { label: this.i18n.tUi('emailLog.eventType.backupNotification', 'Notificação de backup'), value: 4 },
    ];
  });

  readonly detailVisible = signal(false);
  readonly detailLog = signal<EmailLogModel | null>(null);
  readonly detailBodySafe = computed<SafeHtml | null>(() => {
    const body = this.detailLog()?.body;
    return body ? this.sanitizer.bypassSecurityTrustHtml(body) : null;
  });

  protected readonly advancedActiveFilters = computed<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    const subject = this.subject().trim();
    const template = this.template().trim();
    const recipient = this.recipient().trim();
    const status = this.status();
    const eventType = this.eventType();
    const sentAt = this.sentAtRange();

    if (subject) items.push({ label: this.i18n.tUi('emailLog.list.fields.subject', 'Assunto'), value: subject });
    if (template) items.push({ label: this.i18n.tUi('emailLog.list.fields.template', 'Template'), value: template });
    if (recipient) items.push({ label: this.i18n.tUi('emailLog.list.fields.recipient', 'Destinatário'), value: recipient });

    if (status?.length) {
      items.push({ label: this.i18n.tUi('emailLog.list.fields.status', 'Status'), value: status.map((v) => this.statusLabelForCode(v)).join(', ') });
    }
    if (eventType?.length) {
      items.push({
        label: this.i18n.tUi('emailLog.list.fields.eventType', 'Tipo de evento'),
        value: eventType.map((v) => this.eventTypeLabelForCode(v)).join(', '),
      });
    }
    if (sentAt?.[0] && sentAt?.[1]) {
      items.push({
        label: this.i18n.tUi('emailLog.list.fields.sentAt', 'Enviado em'),
        value: `${this.formatDate(sentAt[0])} – ${this.formatDate(sentAt[1])}`,
      });
    }

    return items;
  });

  ngOnInit(): void {
    this.initStatefulList();
  }

  clear(): void {
    this.clearTableAndReload(this.dt);
  }

  viewDetail(row: EmailLogModel): void {
    this.detailLog.set(row);
    this.detailVisible.set(true);
  }

  onDetailVisibleChange(visible: boolean): void {
    this.detailVisible.set(visible);
    if (!visible) this.detailLog.set(null);
  }

  statusLabel(code: string | null): string {
    return this.statusLabelForCode(code != null ? statusCode(code) : null);
  }

  statusSeverity(code: string | null) {
    return statusSeverity(code != null ? statusCode(code) : null);
  }

  eventTypeLabel(code: string | null): string {
    return this.eventTypeLabelForCode(code != null ? eventTypeCode(code) : null);
  }

  private statusLabelForCode(code: number | null): string {
    if (code === 1) return this.i18n.tUi('emailLog.status.sent', 'Enviado');
    if (code === 2) return this.i18n.tUi('emailLog.status.failed', 'Falhou');
    return '—';
  }

  private eventTypeLabelForCode(code: number | null): string {
    if (code === 1) return this.i18n.tUi('emailLog.eventType.passwordReset', 'Reset de senha');
    if (code === 2) return this.i18n.tUi('emailLog.eventType.firstAccess', 'Primeiro acesso');
    if (code === 3) return this.i18n.tUi('emailLog.eventType.chargebackDetected', 'Chargeback detectado');
    if (code === 4) return this.i18n.tUi('emailLog.eventType.backupNotification', 'Notificação de backup');
    return '—';
  }

  protected override tableStateKey(): string {
    return STATE_KEY.EMAIL_LOG.TABLE.STATE.V1;
  }

  protected override tableRowsKey(): string {
    return STATE_KEY.EMAIL_LOG.TABLE.ROWS.V1;
  }

  protected override filtersKey(): string {
    return STATE_KEY.EMAIL_LOG.FILTERS.V1;
  }

  override refresh(): void {
    this.reloadWithCurrentState();
  }

  protected override loadFirstPage(): void {
    const tableQuery = { page: 0, size: this.rows, sort: [], tableFilters: {}, globalFilter: null };
    const query = buildListQuery<EmailLogAdvancedFilters>(tableQuery, this.buildAdvancedFilters());
    this.loadPageInternal(query);
  }

  protected override resetFilters(): void {
    this.subject.set('');
    this.template.set('');
    this.recipient.set('');
    this.status.set(null);
    this.eventType.set(null);
    this.sentAtRange.set(null);
  }

  protected override toFiltersState(): EmailLogFiltersState {
    const sentAt = this.sentAtRange();
    const status = this.status();
    const eventType = this.eventType();

    return {
      subject: this.subject(),
      template: this.template(),
      recipient: this.recipient(),
      status: status?.length ? status.map((c) => statusName(c) ?? '') : null,
      eventType: eventType?.length ? eventType.map((c) => eventTypeName(c) ?? '') : null,
      sentAtRange: sentAt?.[0] && sentAt?.[1] ? [sentAt[0].toISOString(), sentAt[1].toISOString()] : null,
    };
  }

  protected override applyFiltersState(state: EmailLogFiltersState): void {
    this.subject.set(state.subject ?? '');
    this.template.set(state.template ?? '');
    this.recipient.set(state.recipient ?? '');
    this.status.set(state.status?.length ? state.status.map((n) => statusCode(n)).filter((c): c is number => c !== null) : null);
    this.eventType.set(
      state.eventType?.length ? state.eventType.map((n) => eventTypeCode(n)).filter((c): c is number => c !== null) : null,
    );
    this.sentAtRange.set(state.sentAtRange?.[0] && state.sentAtRange?.[1] ? [new Date(state.sentAtRange[0]), new Date(state.sentAtRange[1])] : null);
  }

  protected override buildAdvancedFilters(): Partial<EmailLogAdvancedFilters> {
    const sentAt = this.sentAtRange();

    return {
      subject: this.subject().trim() || undefined,
      template: this.template().trim() || undefined,
      recipient: this.recipient().trim() || undefined,
      status: this.status()?.length ? this.status()!.map((c) => statusName(c)).filter((n): n is NonNullable<typeof n> => !!n) : undefined,
      eventType: this.eventType()?.length
        ? this.eventType()!.map((c) => eventTypeName(c)).filter((n): n is NonNullable<typeof n> => !!n)
        : undefined,
      sentAtFrom: sentAt?.[0] ? sentAt[0].toISOString() : undefined,
      sentAtTo: sentAt?.[1] ? sentAt[1].toISOString() : undefined,
    };
  }

  protected override mapTableFiltersToActiveItems(filters: Record<string, unknown> | null): ActiveFilterItem[] {
    const items: ActiveFilterItem[] = [];

    const subject = readSingleFilterValue(filters, 'subject');
    if (subject) items.push({ label: this.i18n.tUi('emailLog.list.fields.subject', 'Assunto'), value: subject });

    const template = readSingleFilterValue(filters, 'template');
    if (template) items.push({ label: this.i18n.tUi('emailLog.list.fields.template', 'Template'), value: template });

    const recipient = readSingleFilterValue(filters, 'recipient');
    if (recipient) items.push({ label: this.i18n.tUi('emailLog.list.fields.recipient', 'Destinatário'), value: recipient });

    const statuses = readArrayFilterValues(filters, 'status');
    if (statuses.length) {
      items.push({ label: this.i18n.tUi('emailLog.list.fields.status', 'Status'), value: statuses.map((v) => this.statusLabelForCode(Number(v))).join(', ') });
    }

    const eventTypes = readArrayFilterValues(filters, 'eventType');
    if (eventTypes.length) {
      items.push({
        label: this.i18n.tUi('emailLog.list.fields.eventType', 'Tipo de evento'),
        value: eventTypes.map((v) => this.eventTypeLabelForCode(Number(v))).join(', '),
      });
    }

    const sentAt = readDateRangeFilterValue(filters, 'sentAt', this.formatDate.bind(this));
    if (sentAt) items.push({ label: this.i18n.tUi('emailLog.list.fields.sentAt', 'Enviado em'), value: sentAt });

    return items;
  }

  protected override loadPage(query: ReturnType<typeof buildListQuery<EmailLogAdvancedFilters>>): void {
    this.loadPageInternal(query);
  }

  private loadPageInternal(query: ReturnType<typeof buildListQuery<EmailLogAdvancedFilters>>): void {
    this.loading.set(true);
    this.api.search(query).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.logs.set(result._embedded?.content ?? []);
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

  protected formatDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
  }
}
