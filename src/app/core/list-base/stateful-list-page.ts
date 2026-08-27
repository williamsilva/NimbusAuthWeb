import { WritableSignal, computed, signal } from '@angular/core';
import { Table, TableLazyLoadEvent } from 'primeng/table';

import { ActiveFilterGroup, ActiveFilterItem } from '../../shared/filters-panel/filters-panel.component';
import { BaseListPage } from './base-list-page';
import { buildListQuery } from './list-query.builder';
import { mapPrimeLazyToTableQuery } from './primeng-lazy.mapper';

/** Integra BaseListPage com `p-table` server-side (lazy) + `cs-filters-panel` (painel de filtros
 *  avançados) + `p-columnFilter` por coluna, com persistência em 3 chaves de localStorage:
 *
 *  1. FILTERS (via BaseListPage/PersistedFilters) - só os campos do painel avançado, gravada
 *     quando o usuário clica Buscar/Limpar (não a cada digitação).
 *  2. TABLE STATE (tableStateKey) - escrita automaticamente pelo PRÓPRIO PrimeNG
 *     (`[stateStorage]="local"` no p-table: first/rows/sortField/sortOrder/filters etc). Esta
 *     classe só LÊ essa chave manualmente em restoreTableStateFromStorage(), pra reconstruir um
 *     lastLazyEvent sintético e já montar a query certa no primeiro load - o PrimeNG só restaura
 *     isso no DOM, não dispara sozinho uma busca server-side com os filtros certos.
 *  3. TABLE ROWS (tableRowsKey) - redundante com o "rows" dentro do blob acima, mas necessário
 *     porque a property `rows` (usada no binding `[rows]="rows"`) precisa de um valor ANTES do
 *     p-table existir no DOM.
 *
 *  Portado do padrão equivalente do CardSyncWeb (features/list-base/stateful-list-page.ts), sem a
 *  dependência de I18nService (títulos fixos em pt-BR) e sem os helpers de período/moeda/inteiro
 *  (não usados pelas telas de Usuários/Grupos). */
export abstract class StatefulListPage<TState, TAdvancedFilter> extends BaseListPage<TState> {
  static readonly DEFAULT_ROWS = 20;

  abstract rows: number;
  readonly rowsPerPageOptions = [10, 20, 30, 50, 100];

  searchedOnce = false;
  protected skipNextLazy = false;
  protected lastLazyEvent: TableLazyLoadEvent | null = null;

  readonly tableFiltersState: WritableSignal<Record<string, unknown> | null> = signal(null);

  protected abstract loadFirstPage(): void;
  protected abstract tableRowsKey(): string;
  protected abstract tableStateKey(): string;
  protected abstract advancedActiveFilters(): ActiveFilterItem[];
  protected abstract buildAdvancedFilters(): Partial<TAdvancedFilter>;
  protected abstract mapTableFiltersToActiveItems(filters: Record<string, unknown> | null): ActiveFilterItem[];
  protected abstract loadPage(query: ReturnType<typeof buildListQuery<TAdvancedFilter>>): void;

  readonly tableActiveFilters = computed<ActiveFilterItem[]>(() => this.mapTableFiltersToActiveItems(this.tableFiltersState()));

  readonly activeFilterGroups = computed<ActiveFilterGroup[]>(() => {
    const groups: ActiveFilterGroup[] = [];
    const advanced = this.advancedActiveFilters();
    if (advanced.length) groups.push({ title: 'Filtros avançados', filters: advanced });
    const table = this.tableActiveFilters();
    if (table.length) groups.push({ title: 'Filtros da tabela', filters: table });
    return groups;
  });

  readonly activeFiltersCount = computed(() => this.advancedActiveFilters().length + this.tableActiveFilters().length);

  /** Hook opt-in pra filtro-padrão persistente (ex.: Users -> status default = Ativo+Pendente) -
   *  sobrescrito só pela tela que precisa. O gate (SE deve aplicar) é applyDefaultAdvancedFiltersIfEmpty,
   *  chamado depois de resetFilters()/applyFiltersState() - só entra em ação quando o painel
   *  inteiro está vazio (não campo a campo), pra não sobrescrever um filtro real do usuário. */
  protected applyDefaultAdvancedFilters(): void {
    // no-op por padrão
  }

  protected applyDefaultAdvancedFiltersIfEmpty(): void {
    if (this.advancedActiveFilters().length === 0) {
      this.applyDefaultAdvancedFilters();
    }
  }

  protected initStatefulList(): void {
    this.restoreTableStateFromStorage();
    this.loadOnInit();
    if (this.advancedActiveFilters().length > 0 || !!this.lastLazyEvent) {
      this.searchedOnce = true;
    }
    this.skipNextLazy = true;
  }

  private restoreTableStateFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.tableStateKey());
      if (!raw) return;

      const state = JSON.parse(raw) as Record<string, unknown>;
      this.lastLazyEvent = {
        first: (state['first'] as number) ?? 0,
        rows: (state['rows'] as number) ?? this.rows,
        sortField: state['sortField'] as string | undefined,
        sortOrder: state['sortOrder'] as number | undefined,
        multiSortMeta: state['multiSortMeta'] as { field: string; order: number }[] | undefined,
        filters: state['filters'] as Record<string, unknown> | undefined,
      } as TableLazyLoadEvent;

      this.tableFiltersState.set(this.cloneTableFilters(this.lastLazyEvent.filters));
    } catch {
      // estado corrompido - ignora, começa do zero
    }
  }

  search(): void {
    this.persistFilters();
    this.searchedOnce = true;
    if (this.lastLazyEvent) this.lastLazyEvent.first = 0;
    this.reloadWithCurrentState();
  }

  clearTableAndReload(dt?: Table): void {
    this.resetFilters();
    this.persistFilters();
    this.rows = StatefulListPage.DEFAULT_ROWS;
    localStorage.setItem(this.tableRowsKey(), String(this.rows));
    localStorage.removeItem(this.tableStateKey());
    this.tableFiltersState.set(null);
    this.lastLazyEvent = null;
    this.searchedOnce = false;
    dt?.reset();
    this.loadFirstPage();
  }

  onPageChange(event: { rows?: number }): void {
    if (event?.rows) {
      this.rows = event.rows;
      localStorage.setItem(this.tableRowsKey(), String(this.rows));
    }
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.lastLazyEvent = event;
    this.tableFiltersState.set(this.cloneTableFilters(event?.filters));

    if (this.skipNextLazy) {
      this.skipNextLazy = false;
      return;
    }

    const hasTableInteraction =
      !!event?.filters || event?.sortField != null || (Array.isArray(event?.multiSortMeta) && event.multiSortMeta.length > 0);

    // Não busca de novo se só há filtros do painel avançado pendentes (usuário ainda não clicou
    // Buscar) - evita um fetch extra logo na abertura da tela quando há filtro persistido.
    if (!this.searchedOnce && this.activeFiltersCount() > 0 && !hasTableInteraction) {
      return;
    }

    this.reloadWithCurrentState();
  }

  protected reloadWithCurrentState(): void {
    const tableQuery = mapPrimeLazyToTableQuery(this.lastLazyEvent ?? { first: 0, rows: this.rows }, this.rows);
    const query = buildListQuery<TAdvancedFilter>(tableQuery, this.buildAdvancedFilters());
    this.rows = tableQuery.size;
    localStorage.setItem(this.tableRowsKey(), String(this.rows));
    this.loadPage(query);
  }

  private cloneTableFilters(filters: unknown): Record<string, unknown> | null {
    if (!filters) return null;
    try {
      return JSON.parse(JSON.stringify(filters)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
