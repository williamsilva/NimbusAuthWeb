import { PersistedFilters } from './persisted-filters';

/** Contrato mínimo de "página de lista com filtros persistidos em localStorage" - ver
 *  StatefulListPage (que estende esta classe com a integração completa com p-table). Portado do
 *  padrão equivalente do CardSyncWeb (shared/features/list-base/base-list-page.ts). */
export abstract class BaseListPage<TState> {
  protected abstract filtersKey(): string;
  protected abstract refresh(): void;
  protected abstract resetFilters(): void;
  protected abstract toFiltersState(): TState;
  protected abstract applyFiltersState(state: TState): void;

  private persistedFiltersStore: PersistedFilters<TState> | null = null;

  private persisted(): PersistedFilters<TState> {
    if (!this.persistedFiltersStore) {
      this.persistedFiltersStore = new PersistedFilters<TState>(this.filtersKey());
    }
    return this.persistedFiltersStore;
  }

  protected loadOnInit(): void {
    this.applyPersistedFilters();
    this.refresh();
  }

  protected applyPersistedFilters(): void {
    const state = this.persisted().load();
    if (state) {
      this.applyFiltersState(state);
    }
  }

  protected persistFilters(): void {
    this.persisted().save(this.toFiltersState());
  }

  protected clearAndPersist(): void {
    this.resetFilters();
    this.persisted().save(this.toFiltersState());
  }

  protected clearPersisted(): void {
    this.persisted().clear();
  }
}
