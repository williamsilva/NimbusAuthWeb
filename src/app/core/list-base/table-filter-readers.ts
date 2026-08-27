/** Helpers puros pra ler o estado de `p-columnFilter` (`event.filters`) e transformar num rótulo
 *  legível pro painel "Filtros ativos" (ver mapTableFiltersToActiveItems nas telas). Portado do
 *  padrão equivalente do CardSyncWeb (features/list-base/table-filter-readers.ts). */
export function readFilterValues(filters: Record<string, unknown> | null | undefined, field: string): unknown[] {
  const metadata = filters?.[field] as { constraints?: { value?: unknown }[] } | { value?: unknown }[] | { value?: unknown } | undefined;
  if (!metadata) return [];

  const constraints: { value?: unknown }[] = Array.isArray(metadata)
    ? metadata
    : Array.isArray((metadata as { constraints?: unknown[] }).constraints)
      ? (metadata as { constraints: { value?: unknown }[] }).constraints
      : [metadata as { value?: unknown }];

  return constraints
    .map((constraint) => constraint?.value)
    .filter((value) => {
      if (value == null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
}

export function readSingleFilterValue(filters: Record<string, unknown> | null | undefined, field: string): string | null {
  const values = readFilterValues(filters, field)
    .map((value) => `${value}`.trim())
    .filter(Boolean);

  return values.length ? values.join(', ') : null;
}

export function readArrayFilterValues(filters: Record<string, unknown> | null | undefined, field: string): string[] {
  return readFilterValues(filters, field)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => `${value}`.trim())
    .filter(Boolean);
}

export function readDateRangeFilterValue(
  filters: Record<string, unknown> | null | undefined,
  field: string,
  formatDate: (value: Date | string) => string,
): string | null {
  const range = readFilterValues(filters, field).find((value) => Array.isArray(value) && value[0] && value[1]) as
    | [unknown, unknown]
    | undefined;

  if (!range) return null;

  return `${formatDate(range[0] as Date | string)} – ${formatDate(range[1] as Date | string)}`;
}
