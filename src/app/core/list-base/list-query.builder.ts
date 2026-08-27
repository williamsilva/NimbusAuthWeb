import { ListQueryBody, TableQueryDto } from '../api/list-query.models';

/** Faz merge do TableQueryDto (paginação/ordenação/filtros de coluna, já extraído do
 *  LazyLoadEvent do PrimeNG - ver primeng-lazy.mapper.ts) com os filtros do painel avançado,
 *  removendo campos vazios/null/undefined recursivamente do "advanced" antes de mandar - o
 *  backend já ignora campos ausentes, mas um payload limpo facilita debug. */
export function buildListQuery<TAdvanced>(tableQuery: TableQueryDto, advanced: Partial<TAdvanced>): ListQueryBody<TAdvanced> {
  return {
    ...tableQuery,
    advanced: (cleanValue(advanced) as TAdvanced | undefined) ?? null,
  };
}

function cleanValue(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined;
  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    const cleaned = value.map(cleanValue).filter((v) => v !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  if (typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    let hasAny = false;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cv = cleanValue(v);
      if (cv !== undefined) {
        cleaned[k] = cv;
        hasAny = true;
      }
    }
    return hasAny ? cleaned : undefined;
  }

  return value;
}
