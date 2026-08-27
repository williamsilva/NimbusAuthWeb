import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { tap } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
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

import { APP_KEY } from '../../../core/api/api.config';
import { buildListQuery } from '../../../core/list-base/list-query.builder';
import { readArrayFilterValues, readDateRangeFilterValue, readSingleFilterValue } from '../../../core/list-base/table-filter-readers';
import { StatefulListPage } from '../../../core/list-base/stateful-list-page';
import { BulkActionListPage } from '../../../core/list-base/bulk-action-list-page';
import { STATE_KEY } from '../../../core/state-key.constants';
import { ActiveFilterItem, FiltersPanelComponent } from '../../../shared/filters-panel/filters-panel.component';
import { CpfCnpjMaskDirective } from '../../../shared/directives/cpf-cnpj-mask.directive';
import { statusCode, statusLabel, statusName, statusSeverity, USER_STATUS_OPTIONS } from '../user-status';
import { BulkUserActionMode, UsersSelectionPolicy } from '../users-selection.policy';
import { UsersApiService } from '../users.api.service';
import { UserModel, UserOption, UsersAdvancedFilters, UsersFiltersState } from '../users.models';
import { UsersFormDialogComponent } from '../users-form-dialog/users-form-dialog.component';

/** Tela de gestão de Usuários (globais - compartilhados entre cardsync/nimbusflow/nimbusnovax/
 *  nimbusauth), no mesmo padrão de lista avançada do CardSyncWeb (StatefulListPage +
 *  cs-filters-panel + p-columnFilter por coluna, ver core/list-base). Lista sempre restrita a quem
 *  tem grupo do app nimbusauth (groupAppKey fixo em buildAdvancedFilters). Sem exclusão - não
 *  existe endpoint de delete de usuário no backend, só ativar/inativar. */
@Component({
  standalone: true,
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  imports: [
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    CpfCnpjMaskDirective,
    DatePickerModule,
    DatePipe,
    FiltersPanelComponent,
    FloatLabel,
    FormsModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    UsersFormDialogComponent,
  ],
})
export class UsersListComponent extends StatefulListPage<UsersFiltersState, UsersAdvancedFilters> {
  @ViewChild('dt') private dt?: Table;

  private readonly api = inject(UsersApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toast = inject(MessageService);
  protected readonly confirm = inject(ConfirmationService);
  protected readonly selectionPolicy = inject(UsersSelectionPolicy);

  override rows = Number(localStorage.getItem(this.tableRowsKey())) || StatefulListPage.DEFAULT_ROWS;

  private readonly bulk = new (class extends BulkActionListPage {
    protected override readonly toast = inject(MessageService);
    protected override readonly confirm = inject(ConfirmationService);
    constructor(private readonly host: UsersListComponent) {
      super();
    }
    protected override clearSelection(): void {
      this.host.clearSelection();
    }
  })(this);

  readonly users = signal<UserModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);
  readonly usersOptions = signal<UserOption[]>([]);

  readonly name = signal('');
  readonly userName = signal('');
  readonly document = signal('');
  readonly status = signal<number[] | null>(this.defaultStatus());
  readonly createdBy = signal<string[] | null>(null);
  readonly createdAtRange = signal<Date[] | null>(null);
  readonly lastLoginAtRange = signal<Date[] | null>(null);
  readonly blockedUntilRange = signal<Date[] | null>(null);
  readonly passwordExpiresAtRange = signal<Date[] | null>(null);

  readonly statusOptions = USER_STATUS_OPTIONS;

  readonly dialogVisible = signal(false);
  readonly editingUser = signal<UserModel | null>(null);
  readonly selectedRows = signal<UserModel[]>([]);

  readonly selectionMode = computed<BulkUserActionMode | null>(() => {
    const selected = this.selectedRows();
    if (!selected.length) return null;
    return this.selectionPolicy.modeForRow(selected[0]);
  });

  readonly headerEligibleRows = computed(() => {
    const mode = this.selectionMode();
    if (!mode) return [];
    return this.users().filter((row) => this.selectionPolicy.modeForRow(row) === mode);
  });

  readonly headerChecked = computed(() => {
    const eligible = this.headerEligibleRows();
    if (!eligible.length) return false;
    return eligible.every((row) => this.isRowSelected(row));
  });

  readonly headerIndeterminate = computed(() => {
    const eligible = this.headerEligibleRows();
    if (!eligible.length) return false;
    const selectedCount = eligible.filter((row) => this.isRowSelected(row)).length;
    return selectedCount > 0 && selectedCount < eligible.length;
  });

  readonly selectedActivatableRows = computed(() => this.selectedRows().filter((row) => this.selectionPolicy.modeForRow(row) === 'activate'));
  readonly selectedDeactivatableRows = computed(() =>
    this.selectedRows().filter((row) => this.selectionPolicy.modeForRow(row) === 'deactivate'),
  );

  readonly canActivateSelected = computed(() => this.selectionMode() === 'activate' && this.selectedActivatableRows().length > 0);
  readonly canDeactivateSelected = computed(() => this.selectionMode() === 'deactivate' && this.selectedDeactivatableRows().length > 0);

  readonly selectionModeLabel = computed(() => {
    const mode = this.selectionMode();
    if (mode === 'activate') return 'Ativar selecionados';
    if (mode === 'deactivate') return 'Inativar selecionados';
    return 'Nenhuma ação em lote selecionada';
  });

  protected readonly advancedActiveFilters = computed<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    const statuses = this.status();
    const createdBy = this.createdBy();
    const name = this.name().trim();
    const userName = this.userName().trim();
    const document = this.document().trim();

    const create = this.createdAtRange();
    const last = this.lastLoginAtRange();
    const blocked = this.blockedUntilRange();
    const expires = this.passwordExpiresAtRange();

    if (name) items.push({ label: 'Nome', value: name });
    if (userName) items.push({ label: 'E-mail', value: userName });
    if (document) items.push({ label: 'Documento', value: document });

    if (statuses?.length) {
      items.push({ label: 'Status', value: statuses.map((v) => statusLabel(v)).join(', ') });
    }

    if (createdBy?.length) {
      const labels = this.usersOptions()
        .filter((opt) => createdBy.includes(opt.id))
        .map((opt) => opt.name)
        .join(', ');
      items.push({ label: 'Criado por', value: labels });
    }

    if (create?.[0] && create?.[1]) {
      items.push({ label: 'Criado em', value: `${this.formatDate(create[0])} – ${this.formatDate(create[1])}` });
    }
    if (last?.[0] && last?.[1]) {
      items.push({ label: 'Último login', value: `${this.formatDate(last[0])} – ${this.formatDate(last[1])}` });
    }
    if (blocked?.[0] && blocked?.[1]) {
      items.push({ label: 'Bloqueado até', value: `${this.formatDate(blocked[0])} – ${this.formatDate(blocked[1])}` });
    }
    if (expires?.[0] && expires?.[1]) {
      items.push({ label: 'Senha expira em', value: `${this.formatDate(expires[0])} – ${this.formatDate(expires[1])}` });
    }

    return items;
  });

  ngOnInit(): void {
    this.api.optionsFilter().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((opts) => this.usersOptions.set(opts));
    this.initStatefulList();
  }

  clear(): void {
    this.clearTableAndReload(this.dt);
  }

  goNew(): void {
    this.editingUser.set(null);
    this.dialogVisible.set(true);
  }

  edit(row: UserModel): void {
    this.editingUser.set(row);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
    if (!visible) this.editingUser.set(null);
  }

  onSaved(): void {
    this.refresh();
  }

  canResendInvite(row: UserModel): boolean {
    return row.status === 5;
  }

  resendInvite(row: UserModel): void {
    this.api.resendInvite(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.toast.add({ severity: 'success', summary: 'Convite reenviado', detail: `E-mail reenviado para ${row.userName}.` }),
    });
  }

  isRowCheckboxDisabled(row: UserModel): boolean {
    if (this.isRowSelected(row)) return false;

    const rowMode = this.selectionPolicy.modeForRow(row);
    const currentMode = this.selectionMode();

    if (!currentMode) return rowMode === null;
    return rowMode !== currentMode;
  }

  isRowSelected(row: UserModel): boolean {
    return this.selectedRows().some((item) => item.id === row.id);
  }

  toggleRowSelection(row: UserModel, checked: boolean): void {
    const current = this.selectedRows();

    if (!checked) {
      this.selectedRows.set(current.filter((item) => item.id !== row.id));
      return;
    }

    const rowMode = this.selectionPolicy.modeForRow(row);
    if (!rowMode) return;

    if (!current.length) {
      this.selectedRows.set([row]);
      return;
    }

    if (rowMode !== this.selectionMode()) return;
    if (this.isRowSelected(row)) return;

    this.selectedRows.set([...current, row]);
  }

  toggleHeaderSelection(checked: boolean): void {
    const eligible = this.headerEligibleRows();
    if (!eligible.length) return;

    if (!checked) {
      this.clearSelection();
      return;
    }

    this.selectedRows.set([...eligible]);
  }

  activate(row: UserModel): void {
    this.bulk.executeAction(this.api.activate(row.id).pipe(tap(() => this.reloadAfterAction())), `"${row.name}" foi ativado.`);
  }

  deactivate(row: UserModel): void {
    this.bulk.executeAction(this.api.deactivate(row.id).pipe(tap(() => this.reloadAfterAction())), `"${row.name}" foi inativado.`);
  }

  confirmActivate(row: UserModel): void {
    this.bulk.confirmAction({
      header: 'Ativar usuário',
      message: `Ativar "${row.name}"?`,
      icon: 'pi pi-check-circle',
      accept: () => this.activate(row),
    });
  }

  confirmDeactivate(row: UserModel): void {
    this.bulk.confirmAction({
      header: 'Inativar usuário',
      message: `Inativar "${row.name}"? A pessoa não consegue mais logar em nenhum app até ser reativada.`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deactivate(row),
    });
  }

  activateSelected(): void {
    const rows = this.selectedActivatableRows();
    if (!rows.length) return;
    this.bulk.executeAction(
      this.api.activateBulk(rows.map((row) => row.id)).pipe(tap(() => this.reloadAfterAction())),
      `${rows.length} usuário(s) ativado(s).`,
    );
  }

  deactivateSelected(): void {
    const rows = this.selectedDeactivatableRows();
    if (!rows.length) return;
    this.bulk.executeAction(
      this.api.deactivateBulk(rows.map((row) => row.id)).pipe(tap(() => this.reloadAfterAction())),
      `${rows.length} usuário(s) inativado(s).`,
    );
  }

  confirmActivateSelected(): void {
    const rows = this.selectedActivatableRows();
    if (!rows.length) return;
    this.bulk.confirmAction({
      header: 'Ativar selecionados',
      message: `Ativar ${rows.length} usuário(s) selecionado(s)?`,
      icon: 'pi pi-check-circle',
      accept: () => this.activateSelected(),
    });
  }

  confirmDeactivateSelected(): void {
    const rows = this.selectedDeactivatableRows();
    if (!rows.length) return;
    this.bulk.confirmAction({
      header: 'Inativar selecionados',
      message: `Inativar ${rows.length} usuário(s) selecionado(s)?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deactivateSelected(),
    });
  }

  statusLabel(status: number | null): string {
    return statusLabel(status);
  }

  statusSeverity(status: number | null) {
    return statusSeverity(status);
  }

  formatDocument(document: string): string {
    const d = (document ?? '').replace(/\D+/g, '');
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return document;
  }

  protected override tableStateKey(): string {
    return STATE_KEY.USERS.TABLE.STATE.V1;
  }

  protected override tableRowsKey(): string {
    return STATE_KEY.USERS.TABLE.ROWS.V1;
  }

  protected override filtersKey(): string {
    return STATE_KEY.USERS.FILTERS.V1;
  }

  // público (não protected) - a classe `bulk` acima, embora instanciada dentro deste componente,
  // não é uma subclasse dele (é composição, não herança - TS não permite herança múltipla), então
  // precisa acessar isso como membro público pra poder recarregar a lista após uma ação.
  override refresh(): void {
    this.reloadWithCurrentState();
  }

  protected override loadFirstPage(): void {
    const tableQuery = { page: 0, size: this.rows, sort: [], tableFilters: {}, globalFilter: null };
    const query = buildListQuery<UsersAdvancedFilters>(tableQuery, this.buildAdvancedFilters());
    this.clearSelection();
    this.loadPageInternal(query);
  }

  /** Vem pré-selecionado com Ativo+Pendente de senha - mesmo padrão do CardSyncWeb. O gate que
   *  decide SE isso deve ser aplicado (painel inteiro vazio, não campo a campo) vive na classe
   *  base (applyDefaultAdvancedFiltersIfEmpty). */
  private defaultStatus(): number[] {
    return [1, 5];
  }

  protected override applyDefaultAdvancedFilters(): void {
    this.status.set(this.defaultStatus());
  }

  protected override resetFilters(): void {
    this.name.set('');
    this.userName.set('');
    this.document.set('');
    this.status.set(null);
    this.createdBy.set(null);
    this.createdAtRange.set(null);
    this.lastLoginAtRange.set(null);
    this.blockedUntilRange.set(null);
    this.passwordExpiresAtRange.set(null);
    this.applyDefaultAdvancedFiltersIfEmpty();
  }

  protected override toFiltersState(): UsersFiltersState {
    const create = this.createdAtRange();
    const last = this.lastLoginAtRange();
    const blocked = this.blockedUntilRange();
    const expires = this.passwordExpiresAtRange();

    const status = this.status();

    return {
      name: this.name(),
      userName: this.userName(),
      document: this.document(),
      status: status?.length ? status.map((c) => statusName(c) ?? '') : null,
      createdBy: this.createdBy()?.length ? this.createdBy() : null,
      lastLoginAtRange: last?.[0] && last?.[1] ? [last[0].toISOString(), last[1].toISOString()] : null,
      createdAtRange: create?.[0] && create?.[1] ? [create[0].toISOString(), create[1].toISOString()] : null,
      blockedUntilRange: blocked?.[0] && blocked?.[1] ? [blocked[0].toISOString(), blocked[1].toISOString()] : null,
      passwordExpiresAtRange: expires?.[0] && expires?.[1] ? [expires[0].toISOString(), expires[1].toISOString()] : null,
    };
  }

  protected override applyFiltersState(s: UsersFiltersState): void {
    this.name.set(s.name ?? '');
    this.userName.set(s.userName ?? '');
    this.document.set(s.document ?? '');
    this.status.set(s.status?.length ? (s.status.map((n) => statusCode(n)).filter((c): c is number => c !== null)) : null);
    this.createdBy.set(s.createdBy ?? null);

    this.lastLoginAtRange.set(s.lastLoginAtRange?.[0] && s.lastLoginAtRange?.[1] ? [new Date(s.lastLoginAtRange[0]), new Date(s.lastLoginAtRange[1])] : null);
    this.createdAtRange.set(s.createdAtRange?.[0] && s.createdAtRange?.[1] ? [new Date(s.createdAtRange[0]), new Date(s.createdAtRange[1])] : null);
    this.blockedUntilRange.set(s.blockedUntilRange?.[0] && s.blockedUntilRange?.[1] ? [new Date(s.blockedUntilRange[0]), new Date(s.blockedUntilRange[1])] : null);
    this.passwordExpiresAtRange.set(
      s.passwordExpiresAtRange?.[0] && s.passwordExpiresAtRange?.[1] ? [new Date(s.passwordExpiresAtRange[0]), new Date(s.passwordExpiresAtRange[1])] : null,
    );

    this.applyDefaultAdvancedFiltersIfEmpty();
  }

  protected override buildAdvancedFilters(): Partial<UsersAdvancedFilters> {
    const create = this.createdAtRange();
    const last = this.lastLoginAtRange();
    const blocked = this.blockedUntilRange();
    const expires = this.passwordExpiresAtRange();

    return {
      name: this.name().trim() || undefined,
      userName: this.userName().trim() || undefined,
      document: this.document().replace(/\D+/g, '') || undefined,
      groupAppKey: APP_KEY,
      status: this.status()?.length ? (this.status()!.map((c) => statusName(c)).filter((n): n is NonNullable<typeof n> => !!n)) : undefined,
      createdBy: this.createdBy()?.length ? this.createdBy()! : undefined,
      createdAtFrom: create?.[0] ? create[0].toISOString() : undefined,
      createdAtTo: create?.[1] ? create[1].toISOString() : undefined,
      lastLoginAtFrom: last?.[0] ? last[0].toISOString() : undefined,
      lastLoginAtTo: last?.[1] ? last[1].toISOString() : undefined,
      blockedUntilFrom: blocked?.[0] ? blocked[0].toISOString() : undefined,
      blockedUntilTo: blocked?.[1] ? blocked[1].toISOString() : undefined,
      passwordExpiresAtFrom: expires?.[0] ? expires[0].toISOString() : undefined,
      passwordExpiresAtTo: expires?.[1] ? expires[1].toISOString() : undefined,
    };
  }

  protected override mapTableFiltersToActiveItems(filters: Record<string, unknown> | null): ActiveFilterItem[] {
    const items: ActiveFilterItem[] = [];

    const userName = readSingleFilterValue(filters, 'userName');
    if (userName) items.push({ label: 'E-mail', value: userName });

    const name = readSingleFilterValue(filters, 'name');
    if (name) items.push({ label: 'Nome', value: name });

    const document = readSingleFilterValue(filters, 'document');
    if (document) items.push({ label: 'Documento', value: document });

    const statuses = readArrayFilterValues(filters, 'status');
    if (statuses.length) {
      items.push({ label: 'Status', value: statuses.map((v) => statusLabel(Number(v))).join(', ') });
    }

    const lastLoginAt = readDateRangeFilterValue(filters, 'lastLoginAt', this.formatDate.bind(this));
    if (lastLoginAt) items.push({ label: 'Último login', value: lastLoginAt });

    const blockedUntil = readDateRangeFilterValue(filters, 'blockedUntil', this.formatDate.bind(this));
    if (blockedUntil) items.push({ label: 'Bloqueado até', value: blockedUntil });

    const passwordExpiresAt = readDateRangeFilterValue(filters, 'passwordExpiresAt', this.formatDate.bind(this));
    if (passwordExpiresAt) items.push({ label: 'Senha expira em', value: passwordExpiresAt });

    const createdAt = readDateRangeFilterValue(filters, 'createdAt', this.formatDate.bind(this));
    if (createdAt) items.push({ label: 'Criado em', value: createdAt });

    const createdByValues = readArrayFilterValues(filters, 'createdBy');
    if (createdByValues.length) {
      const labels = this.usersOptions()
        .filter((option) => createdByValues.includes(option.id))
        .map((option) => option.name);
      items.push({ label: 'Criado por', value: (labels.length ? labels : createdByValues).join(', ') });
    }

    return items;
  }

  protected override loadPage(query: ReturnType<typeof buildListQuery<UsersAdvancedFilters>>): void {
    this.clearSelection();
    this.loadPageInternal(query);
  }

  private loadPageInternal(query: ReturnType<typeof buildListQuery<UsersAdvancedFilters>>): void {
    this.loading.set(true);
    this.api.search(query).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.users.set(result._embedded?.content ?? []);
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

  private reloadAfterAction(): void {
    this.reloadWithCurrentState();
  }

  clearSelection(): void {
    this.selectedRows.set([]);
  }

  protected formatDate(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
  }
}
