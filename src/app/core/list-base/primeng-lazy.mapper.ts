import { TableLazyLoadEvent } from 'primeng/table';

import { ColumnFilterDto, SortField, TableQueryDto } from '../api/list-query.models';

/** Converte o LazyLoadEvent nativo do PrimeNG (paginação/ordenação/filtros por coluna) pro
 *  TableQueryDto esperado pelos endpoints POST .../search. O shape de tableFilters já bate 1:1
 *  com o que o PrimeNG produz quando `filterDisplay="menu"` ({operator, constraints:
 *  [{matchMode, value}]}) - só removemos constraints com valor vazio, senão o backend aplicaria
 *  um "IN ()"/"= null" sem sentido pra um filtro que o usuário nem preencheu. */
export function mapPrimeLazyToTableQuery(event: TableLazyLoadEvent | null | undefined, fallbackRows: number): TableQueryDto {
  const size = event?.rows ?? fallbackRows;
  const first = event?.first ?? 0;
  const page = size > 0 ? Math.floor(first / size) : 0;

  return {
    page,
    size,
    sort: buildSort(event),
    tableFilters: buildTableFilters(event?.filters as Record<string, unknown> | undefined),
    globalFilter: ((event as { globalFilter?: string } | null | undefined)?.globalFilter) ?? null,
  };
}

function buildSort(event: TableLazyLoadEvent | null | undefined): SortField[] {
  const multi = event?.multiSortMeta;
  if (Array.isArray(multi) && multi.length > 0) {
    return multi.filter((m) => !!m.field).map((m) => ({ field: String(m.field), order: m.order ?? 1 }));
  }
  if (event?.sortField) {
    return [{ field: String(event.sortField), order: (event.sortOrder as number | undefined) ?? 1 }];
  }
  return [];
}

function buildTableFilters(filters: Record<string, unknown> | undefined): Record<string, ColumnFilterDto> {
  if (!filters) return {};
  const result: Record<string, ColumnFilterDto> = {};

  for (const [field, meta] of Object.entries(filters)) {
    const dto = normalizeColumnFilter(meta);
    if (dto) result[field] = dto;
  }

  return result;
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function normalizeColumnFilter(meta: unknown): ColumnFilterDto | null {
  if (!meta || typeof meta !== 'object') return null;
  const m = meta as { operator?: string; constraints?: { value?: unknown; matchMode?: string }[]; value?: unknown; matchMode?: string };

  const rawConstraints = Array.isArray(m.constraints) ? m.constraints : [{ value: m.value, matchMode: m.matchMode }];
  const constraints = rawConstraints
    .filter((c) => c && !isEmptyValue(c.value))
    .map((c) => ({ matchMode: c.matchMode || 'contains', value: c.value }));

  if (constraints.length === 0) return null;

  return { operator: (m.operator as 'and' | 'or') || 'and', constraints };
}
