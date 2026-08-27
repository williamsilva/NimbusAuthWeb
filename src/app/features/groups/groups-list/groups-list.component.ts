import { Component, DestroyRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { tap } from 'rxjs';

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

import { buildListQuery } from '../../../core/list-base/list-query.builder';
import { readArrayFilterValues, readDateRangeFilterValue, readSingleFilterValue } from '../../../core/list-base/table-filter-readers';
import { StatefulListPage } from '../../../core/list-base/stateful-list-page';
import { BulkActionListPage } from '../../../core/list-base/bulk-action-list-page';
import { STATE_KEY } from '../../../core/state-key.constants';
import { ActiveFilterItem, FiltersPanelComponent } from '../../../shared/filters-panel/filters-panel.component';
import { AppsApiService } from '../../apps/apps.api.service';
import { UsersApiService } from '../../users/users.api.service';
import { UserOption } from '../../users/users.models';
import { GroupsApiService } from '../groups.api.service';
import { GroupModel, GroupsAdvancedFilters, GroupsFiltersState } from '../groups.models';
import { GroupsFormDialogComponent } from '../groups-form-dialog/groups-form-dialog.component';
import { GroupManageDialogComponent } from '../group-manage-dialog/group-manage-dialog.component';

/** Tela de gestão de Grupos - painel central, lista/gerencia grupos de TODOS os apps cadastrados
 *  (cardsync/nimbusflow/nimbusnovax/nimbusauth), no mesmo padrão de lista avançada do CardSyncWeb
 *  (StatefulListPage + cs-filters-panel + p-columnFilter por coluna, ver core/list-base). Criar/
 *  editar só nome+descrição+app (dialog simples, app imutável depois); permissões e usuários do
 *  grupo são geridos num dialog à parte (group-manage-dialog). */
@Component({
  standalone: true,
  selector: 'app-groups-list',
  templateUrl: './groups-list.component.html',
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
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    GroupsFormDialogComponent,
    GroupManageDialogComponent,
  ],
})
export class GroupsListComponent extends StatefulListPage<GroupsFiltersState, GroupsAdvancedFilters> {
  @ViewChild('dt') private dt?: Table;

  private readonly api = inject(GroupsApiService);
  private readonly usersApi = inject(UsersApiService);
  private readonly appsApi = inject(AppsApiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toast = inject(MessageService);
  protected readonly confirm = inject(ConfirmationService);

  override rows = Number(localStorage.getItem(this.tableRowsKey())) || StatefulListPage.DEFAULT_ROWS;

  private readonly bulk = new (class extends BulkActionListPage {
    protected override readonly toast = inject(MessageService);
    protected override readonly confirm = inject(ConfirmationService);
    constructor(private readonly host: GroupsListComponent) {
      super();
    }
    protected override clearSelection(): void {}

    confirmDelete(row: GroupModel): void {
      this.confirmAction({
        header: 'Excluir grupo',
        message: `Excluir "${row.name}"? Só é possível se não houver nenhum usuário vinculado a ele.`,
        icon: 'pi pi-exclamation-triangle',
        accept: () =>
          this.executeAction(this.host.api.delete(row.id).pipe(tap(() => this.host.refresh())), `"${row.name}" foi excluído.`),
      });
    }
  })(this);

  readonly groups = signal<GroupModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);
  readonly usersOptions = signal<UserOption[]>([]);
  // Sem opção "Todos os apps" com value:null aqui de propósito - misturada às opções reais, o
  // p-floatLabel acha o campo vazio (value null) mas o select mostra o texto dela mesmo assim,
  // sobrepondo com o label flutuante. "Todos os apps" vira o placeholder do p-select no HTML.
  readonly appOptions = signal<{ label: string; value: string }[]>([]);
  private readonly appNames = signal<Record<string, string>>({});

  readonly name = signal('');
  readonly description = signal('');
  readonly appKey = signal<string | null>(null);
  readonly createdBy = signal<string[] | null>(null);
  readonly createdAtRange = signal<Date[] | null>(null);

  readonly dialogVisible = signal(false);
  readonly editingGroup = signal<GroupModel | null>(null);
  readonly manageDialogVisible = signal(false);
  readonly managingGroup = signal<GroupModel | null>(null);

  protected readonly advancedActiveFilters = computed<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    const name = this.name().trim();
    const description = this.description().trim();
    const appKey = this.appKey();
    const createdBy = this.createdBy();
    const createdAtRange = this.createdAtRange();

    if (name) items.push({ label: 'Nome', value: name });
    if (description) items.push({ label: 'Descrição', value: description });
    if (appKey) items.push({ label: 'App', value: this.appName(appKey) });

    if (createdBy?.length) {
      const labels = this.usersOptions()
        .filter((opt) => createdBy.includes(opt.id))
        .map((opt) => opt.name)
        .join(', ');
      items.push({ label: 'Criado por', value: labels });
    }

    if (createdAtRange?.[0] && createdAtRange?.[1]) {
      items.push({ label: 'Criado em', value: `${this.formatDate(createdAtRange[0])} – ${this.formatDate(createdAtRange[1])}` });
    }

    return items;
  });

  ngOnInit(): void {
    this.usersApi.optionsFilter().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((opts) => this.usersOptions.set(opts));
    this.appsApi.search('', 0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      const apps = result._embedded?.content ?? [];
      this.appOptions.set(apps.map((a) => ({ label: a.name, value: a.appKey })));
      this.appNames.set(Object.fromEntries(apps.map((a) => [a.appKey, a.name])));
    });
    this.initStatefulList();
  }

  appName(appKey: string): string {
    return this.appNames()[appKey] ?? appKey;
  }

  clear(): void {
    this.clearTableAndReload(this.dt);
  }

  goNew(): void {
    this.editingGroup.set(null);
    this.dialogVisible.set(true);
  }

  edit(row: GroupModel): void {
    this.editingGroup.set(row);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
    if (!visible) this.editingGroup.set(null);
  }

  onSaved(): void {
    this.refresh();
  }

  manage(row: GroupModel): void {
    this.managingGroup.set(row);
    this.manageDialogVisible.set(true);
  }

  onManageDialogVisibleChange(visible: boolean): void {
    this.manageDialogVisible.set(visible);
    if (!visible) {
      this.managingGroup.set(null);
      this.refresh();
    }
  }

  onManageSaved(): void {
    this.refresh();
  }

  confirmDelete(row: GroupModel): void {
    this.bulk.confirmDelete(row);
  }

  protected override tableStateKey(): string {
    return STATE_KEY.GROUPS.TABLE.STATE.V1;
  }

  protected override tableRowsKey(): string {
    return STATE_KEY.GROUPS.TABLE.ROWS.V1;
  }

  protected override filtersKey(): string {
    return STATE_KEY.GROUPS.FILTERS.V1;
  }

  // público (não protected) - a classe `bulk` acima não é subclasse deste componente (composição,
  // não herança), precisa acessar isso como membro público pra recarregar após excluir.
  override refresh(): void {
    this.reloadWithCurrentState();
  }

  protected override loadFirstPage(): void {
    const tableQuery = { page: 0, size: this.rows, sort: [], tableFilters: {}, globalFilter: null };
    const query = buildListQuery<GroupsAdvancedFilters>(tableQuery, this.buildAdvancedFilters());
    this.loadPageInternal(query);
  }

  protected override resetFilters(): void {
    this.name.set('');
    this.description.set('');
    this.appKey.set(null);
    this.createdBy.set(null);
    this.createdAtRange.set(null);
  }

  protected override toFiltersState(): GroupsFiltersState {
    const createdAtRange = this.createdAtRange();

    return {
      name: this.name(),
      description: this.description(),
      appKey: this.appKey(),
      createdBy: this.createdBy()?.length ? this.createdBy() : null,
      createdAtRange: createdAtRange?.[0] && createdAtRange?.[1] ? [createdAtRange[0].toISOString(), createdAtRange[1].toISOString()] : null,
    };
  }

  protected override applyFiltersState(state: GroupsFiltersState): void {
    this.name.set(state.name ?? '');
    this.description.set(state.description ?? '');
    this.appKey.set(state.appKey ?? null);
    this.createdBy.set(state.createdBy ?? null);
    this.createdAtRange.set(
      state.createdAtRange?.[0] && state.createdAtRange?.[1] ? [new Date(state.createdAtRange[0]), new Date(state.createdAtRange[1])] : null,
    );
  }

  protected override buildAdvancedFilters(): Partial<GroupsAdvancedFilters> {
    const createdAtRange = this.createdAtRange();

    return {
      name: this.name().trim() || undefined,
      description: this.description().trim() || undefined,
      appKey: this.appKey() || undefined,
      createdBy: this.createdBy()?.length ? this.createdBy()! : undefined,
      createdAtFrom: createdAtRange?.[0] ? createdAtRange[0].toISOString() : undefined,
      createdAtTo: createdAtRange?.[1] ? createdAtRange[1].toISOString() : undefined,
    };
  }

  protected override mapTableFiltersToActiveItems(filters: Record<string, unknown> | null): ActiveFilterItem[] {
    const items: ActiveFilterItem[] = [];

    const name = readSingleFilterValue(filters, 'name');
    if (name) items.push({ label: 'Nome', value: name });

    const description = readSingleFilterValue(filters, 'description');
    if (description) items.push({ label: 'Descrição', value: description });

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

  protected override loadPage(query: ReturnType<typeof buildListQuery<GroupsAdvancedFilters>>): void {
    this.loadPageInternal(query);
  }

  private loadPageInternal(query: ReturnType<typeof buildListQuery<GroupsAdvancedFilters>>): void {
    this.loading.set(true);
    this.api.search(query).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.groups.set(result._embedded?.content ?? []);
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
