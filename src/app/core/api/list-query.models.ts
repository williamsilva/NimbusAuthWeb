/** Espelha ListQueryDto do backend (domain/filter/query/ListQueryDto.java) - body padrão dos
 *  endpoints POST .../search. Compartilhado entre features (apps, users, groups) que consomem
 *  busca paginada nesse formato. */
export interface SortField {
  field: string;
  order: number;
}

export interface ListQueryBody<TAdvanced = Record<string, unknown>> {
  page: number;
  size: number;
  sort: SortField[];
  tableFilters: Record<string, unknown>;
  globalFilter: string | null;
  advanced: TAdvanced | null;
}

/** Espelha o PagedModel (HATEOAS/Spring HATEOAS) devolvido pelos endpoints POST .../search. */
export interface HalPagedResponse<T> {
  _embedded?: { content: T[] };
  page: { size: number; totalElements: number; totalPages: number; number: number };
}
