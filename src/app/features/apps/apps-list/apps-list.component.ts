import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
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
import { AuthService } from '../../../core/auth/auth.service';
import { UsersApiService } from '../../users/users.api.service';
import { UserOption } from '../../users/users.models';
import { AppsApiService } from '../apps.api.service';
import { AppModel, AppSecretModel, AppsAdvancedFilters, AppsFiltersState } from '../apps.models';
import { AppsFormDialogComponent } from '../apps-form-dialog/apps-form-dialog.component';
import { AppsSecretDialogComponent } from '../apps-secret-dialog/apps-secret-dialog.component';

/** Tela de gestão de Apps (clients OAuth2 relying party) - lista + dialog de criar/editar + dialog
 *  de revelação de secret, no mesmo padrão de lista avançada de Usuários/Grupos/Auditoria de
 *  E-mail (StatefulListPage + cs-filters-panel + p-columnFilter por coluna, ver core/list-base).
 *  Backend (`AppsController#search`) já usa o mesmo `ListQueryDto<AppsFilter>` genérico daquelas
 *  telas - só o frontend não explorava isso ainda. */
@Component({
  standalone: true,
  selector: 'app-apps-list',
  templateUrl: './apps-list.component.html',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    DatePipe,
    FiltersPanelComponent,
    FloatLabel,
    FormsModule,
    InputTextModule,
    MultiSelectModule,
    PageHeaderComponent,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    TranslateModule,
    AppsFormDialogComponent,
    AppsSecretDialogComponent,
  ],
})
export class AppsListComponent extends StatefulListPage<AppsFiltersState, AppsAdvancedFilters> implements OnInit {
  @ViewChild('dt') private dt?: Table;

  private readonly api = inject(AppsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  override rows = Number(localStorage.getItem(this.tableRowsKey())) || StatefulListPage.DEFAULT_ROWS;

  readonly apps = signal<AppModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);
  readonly usersOptions = signal<UserOption[]>([]);

  readonly name = signal('');
  readonly appKey = signal('');
  readonly active = signal<boolean | null>(null);
  readonly createdBy = signal<string[] | null>(null);
  readonly createdAtRange = signal<Date[] | null>(null);

  readonly statusOptions = computed(() => {
    this.i18n.appliedLang();
    return [
      { label: this.i18n.tUi('apps.list.statusActive', 'Ativo'), value: true },
      { label: this.i18n.tUi('apps.list.statusInactive', 'Inativo'), value: false },
    ];
  });

  readonly dialogVisible = signal(false);
  readonly editingApp = signal<AppModel | null>(null);
  readonly revealedSecret = signal<AppSecretModel | null>(null);

  protected readonly advancedActiveFilters = computed<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    const name = this.name().trim();
    const appKey = this.appKey().trim();
    const active = this.active();
    const createdBy = this.createdBy();
    const createdAtRange = this.createdAtRange();

    if (name) items.push({ label: this.i18n.tUi('apps.list.fields.name', 'Nome'), value: name });
    if (appKey) items.push({ label: this.i18n.tUi('apps.list.fields.appKey', 'appKey'), value: appKey });

    if (active != null) {
      items.push({ label: this.i18n.tUi('apps.list.fields.status', 'Status'), value: this.statusLabelFor(active) });
    }

    if (createdBy?.length) {
      const labels = this.usersOptions()
        .filter((opt) => createdBy.includes(opt.id))
        .map((opt) => opt.name)
        .join(', ');
      items.push({ label: this.i18n.tUi('apps.list.fields.createdBy', 'Criado por'), value: labels });
    }

    if (createdAtRange?.[0] && createdAtRange?.[1]) {
      items.push({
        label: this.i18n.tUi('apps.list.fields.createdAt', 'Criado em'),
        value: `${this.formatDate(createdAtRange[0])} – ${this.formatDate(createdAtRange[1])}`,
      });
    }

    return items;
  });

  ngOnInit(): void {
    this.usersApi.optionsFilter().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((opts) => this.usersOptions.set(opts));
    this.initStatefulList();
  }

  private statusLabelFor(active: boolean): string {
    return this.i18n.tUi(active ? 'apps.list.statusActive' : 'apps.list.statusInactive', active ? 'Ativo' : 'Inativo');
  }

  clear(): void {
    this.clearTableAndReload(this.dt);
  }

  goNew(): void {
    this.editingApp.set(null);
    this.dialogVisible.set(true);
  }

  edit(row: AppModel): void {
    this.editingApp.set(row);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
    if (!visible) {
      this.editingApp.set(null);
    }
  }

  onSaved(): void {
    this.refresh();
  }

  onCreatedWithSecret(secret: AppSecretModel): void {
    this.revealedSecret.set(secret);
  }

  regenerateSecret(row: AppModel): void {
    this.confirm.confirm({
      header: this.i18n.tUi('apps.list.confirmRegenerate.header', 'Regenerar secret'),
      message: this.i18n.tUi(
        'apps.list.confirmRegenerate.message',
        { name: row.name },
        `Isso invalida o client secret atual de "${row.name}" imediatamente. Os apps que ainda usam o valor antigo param de autenticar até você atualizar a env var lá. Continuar?`,
      ),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.regenerateSecret(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (result) => this.revealedSecret.set(result),
        });
      },
    });
  }

  confirmDelete(row: AppModel): void {
    this.confirm.confirm({
      header: this.i18n.tUi('apps.list.confirmDelete.header', 'Excluir App'),
      message: this.i18n.tUi(
        'apps.list.confirmDelete.message',
        { name: row.name },
        `Excluir "${row.name}"? Isso remove o client OAuth2 imediatamente - ninguém mais consegue logar por ele.`,
      ),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.delete(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.toast.add({
              severity: 'success',
              summary: this.i18n.tUi('apps.list.toastDeleted.summary', 'Excluído'),
              detail: this.i18n.tUi('apps.list.toastDeleted.detail', { name: row.name }, `"${row.name}" foi excluído.`),
            });
            this.refresh();
          },
        });
      },
    });
  }

  onSecretDialogClosed(): void {
    this.revealedSecret.set(null);
    this.refresh();
  }

  logout(): void {
    this.auth.logout();
  }

  protected override tableStateKey(): string {
    return STATE_KEY.APPS.TABLE.STATE.V1;
  }

  protected override tableRowsKey(): string {
    return STATE_KEY.APPS.TABLE.ROWS.V1;
  }

  protected override filtersKey(): string {
    return STATE_KEY.APPS.FILTERS.V1;
  }

  override refresh(): void {
    this.reloadWithCurrentState();
  }

  protected override loadFirstPage(): void {
    const tableQuery = { page: 0, size: this.rows, sort: [], tableFilters: {}, globalFilter: null };
    const query = buildListQuery<AppsAdvancedFilters>(tableQuery, this.buildAdvancedFilters());
    this.loadPageInternal(query);
  }

  protected override resetFilters(): void {
    this.name.set('');
    this.appKey.set('');
    this.active.set(null);
    this.createdBy.set(null);
    this.createdAtRange.set(null);
  }

  protected override toFiltersState(): AppsFiltersState {
    const createdAtRange = this.createdAtRange();

    return {
      name: this.name(),
      appKey: this.appKey(),
      active: this.active(),
      createdBy: this.createdBy()?.length ? this.createdBy() : null,
      createdAtRange: createdAtRange?.[0] && createdAtRange?.[1] ? [createdAtRange[0].toISOString(), createdAtRange[1].toISOString()] : null,
    };
  }

  protected override applyFiltersState(state: AppsFiltersState): void {
    this.name.set(state.name ?? '');
    this.appKey.set(state.appKey ?? '');
    this.active.set(state.active ?? null);
    this.createdBy.set(state.createdBy ?? null);
    this.createdAtRange.set(
      state.createdAtRange?.[0] && state.createdAtRange?.[1] ? [new Date(state.createdAtRange[0]), new Date(state.createdAtRange[1])] : null,
    );
  }

  protected override buildAdvancedFilters(): Partial<AppsAdvancedFilters> {
    const createdAtRange = this.createdAtRange();
    const active = this.active();

    return {
      name: this.name().trim() || undefined,
      appKey: this.appKey().trim() || undefined,
      active: active ?? undefined,
      createdBy: this.createdBy()?.length ? this.createdBy()! : undefined,
      createdAtFrom: createdAtRange?.[0] ? createdAtRange[0].toISOString() : undefined,
      createdAtTo: createdAtRange?.[1] ? createdAtRange[1].toISOString() : undefined,
    };
  }

  protected override mapTableFiltersToActiveItems(filters: Record<string, unknown> | null): ActiveFilterItem[] {
    const items: ActiveFilterItem[] = [];

    const name = readSingleFilterValue(filters, 'name');
    if (name) items.push({ label: this.i18n.tUi('apps.list.fields.name', 'Nome'), value: name });

    const appKey = readSingleFilterValue(filters, 'appKey');
    if (appKey) items.push({ label: this.i18n.tUi('apps.list.fields.appKey', 'appKey'), value: appKey });

    const clientId = readSingleFilterValue(filters, 'clientId');
    if (clientId) items.push({ label: this.i18n.tUi('apps.list.fields.clientId', 'Client ID'), value: clientId });

    const statusValues = readArrayFilterValues(filters, 'active');
    if (statusValues.length) {
      items.push({
        label: this.i18n.tUi('apps.list.fields.status', 'Status'),
        value: statusValues.map((v) => this.statusLabelFor(v === 'true')).join(', '),
      });
    }

    const createdAt = readDateRangeFilterValue(filters, 'createdAt', this.formatDate.bind(this));
    if (createdAt) items.push({ label: this.i18n.tUi('apps.list.fields.createdAt', 'Criado em'), value: createdAt });

    const createdByValues = readArrayFilterValues(filters, 'createdBy');
    if (createdByValues.length) {
      const labels = this.usersOptions()
        .filter((option) => createdByValues.includes(option.id))
        .map((option) => option.name);
      items.push({
        label: this.i18n.tUi('apps.list.fields.createdBy', 'Criado por'),
        value: (labels.length ? labels : createdByValues).join(', '),
      });
    }

    return items;
  }

  protected override loadPage(query: ReturnType<typeof buildListQuery<AppsAdvancedFilters>>): void {
    this.loadPageInternal(query);
  }

  private loadPageInternal(query: ReturnType<typeof buildListQuery<AppsAdvancedFilters>>): void {
    this.loading.set(true);
    this.api.searchAdvanced(query).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.apps.set(result._embedded?.content ?? []);
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
