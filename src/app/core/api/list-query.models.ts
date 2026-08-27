/** Espelha FilterRuleDto/ColumnFilterDto (domain/filter/query/*.java) - formato nativo que o
 *  próprio PrimeNG produz em `event.filters` quando `filterDisplay="menu"` é usado, então o
 *  mapper (primeng-lazy.mapper.ts) praticamente repassa o valor sem transformar o shape. */
export interface FilterRuleDto {
  matchMode: string;
  value: unknown;
}

export interface ColumnFilterDto {
  operator: 'and' | 'or';
  constraints: FilterRuleDto[];
}

export interface SortField {
  field: string;
  order: number;
}

/** Espelha ListQueryDto (domain/filter/query/ListQueryDto.java) - body padrão dos endpoints
 *  POST .../search. Compartilhado entre features (apps, users, groups) que consomem busca
 *  paginada nesse formato. */
export interface TableQueryDto {
  page: number;
  size: number;
  sort: SortField[];
  tableFilters: Record<string, ColumnFilterDto>;
  globalFilter: string | null;
}

export interface ListQueryBody<TAdvanced = Record<string, unknown>> extends TableQueryDto {
  advanced: TAdvanced | null;
}

/** Espelha o PagedModel (HATEOAS/Spring HATEOAS) devolvido pelos endpoints POST .../search. */
export interface HalPagedResponse<T> {
  _embedded?: { content: T[] };
  page: { size: number; totalElements: number; totalPages: number; number: number };
}
