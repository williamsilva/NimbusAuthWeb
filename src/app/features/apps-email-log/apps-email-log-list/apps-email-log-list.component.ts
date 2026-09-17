import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule, TablePageEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { AppsApiService } from '../../apps/apps.api.service';
import { AppModel } from '../../apps/apps.models';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FiltersPanelComponent } from '../../../shared/filters-panel/filters-panel.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { AppsEmailLogApiService } from '../apps-email-log.api.service';
import { AppEmailLogItem } from '../apps-email-log.models';

/** Painel central de Auditoria de E-mail dos apps satélite (cardsync/nimbusflow/nimbusdesk/
 *  nimbusnovax) - mesmo padrão de seletor de apps-email-settings-list, mas com uma tabela paginada
 *  em vez de um dialog (aqui é só leitura). Não reaproveita a tela /email-log já existente (essa é
 *  só do próprio NimbusAuth, eventType fixo/enum) - os 4 satélites têm eventType livre/divergente,
 *  então os filtros aqui são deliberadamente simples (texto livre + status fixo SENT/FAILED +
 *  período), sem o StatefulListPage/filtro avançado por coluna daquela tela. */
@Component({
  standalone: true,
  selector: 'app-apps-email-log-list',
  templateUrl: './apps-email-log-list.component.html',
  imports: [
    ButtonModule,
    DatePickerModule,
    DatePipe,
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

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

  readonly items = signal<AppEmailLogItem[]>([]);
  readonly totalRecords = signal(0);
  readonly rows = 20;
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);

  ngOnInit(): void {
    this.loadApps();
  }

  private loadApps(): void {
    this.loadingApps.set(true);
    this.appsApi.search('', 0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        const content = result._embedded?.content ?? [];
        this.apps.set(content.filter((app) => app.appKey !== 'nimbusauth'));
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

  clear(): void {
    this.recipient.set('');
    this.subject.set('');
    this.eventType.set('');
    this.status.set(null);
    this.sentAtRange.set(null);
    this.search(0);
  }

  onPageChange(event: TablePageEvent): void {
    this.search(event.first / event.rows);
  }

  statusSeverity(status: string | null): 'success' | 'danger' | 'secondary' {
    if (status === 'SENT') return 'success';
    if (status === 'FAILED') return 'danger';
    return 'secondary';
  }
}
