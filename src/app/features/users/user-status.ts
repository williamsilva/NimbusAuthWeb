/** Espelha StatusUserEnum (domain/model/enums/StatusUserEnum.java). O código (número) é o formato
 *  usado por UserModel.status e pelo p-columnFilter (whitelist enumAsIntegerCode); o NOME
 *  (string) é o formato usado no painel de filtros avançados (advanced.status - Jackson
 *  desserializa List<StatusUserEnum> pelo nome do enum, sem @JsonCreator customizado). */
export type UserStatusName = 'NULL' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'DISABLED' | 'PENDING_PASSWORD';

const CODE_TO_NAME: Record<number, UserStatusName> = {
  0: 'NULL',
  1: 'ACTIVE',
  2: 'INACTIVE',
  3: 'BLOCKED',
  4: 'DISABLED',
  5: 'PENDING_PASSWORD',
};

const NAME_TO_CODE: Record<UserStatusName, number> = {
  NULL: 0,
  ACTIVE: 1,
  INACTIVE: 2,
  BLOCKED: 3,
  DISABLED: 4,
  PENDING_PASSWORD: 5,
};

const LABELS: Record<number, string> = {
  1: 'Ativo',
  2: 'Inativo',
  3: 'Bloqueado',
  4: 'Desabilitado',
  5: 'Pendente (1º acesso)',
};

const SEVERITIES: Record<number, 'success' | 'info' | 'warn' | 'secondary' | 'danger'> = {
  1: 'success',
  2: 'secondary',
  3: 'warn',
  4: 'danger',
  5: 'info',
};

export function statusName(code: number | null | undefined): UserStatusName | null {
  return code == null ? null : (CODE_TO_NAME[code] ?? null);
}

export function statusCode(name: string): number | null {
  return NAME_TO_CODE[name as UserStatusName] ?? null;
}

export function statusLabel(code: number | null | undefined): string {
  return (code != null && LABELS[code]) || '—';
}

export function statusSeverity(code: number | null | undefined): 'success' | 'info' | 'warn' | 'secondary' | 'danger' {
  return (code != null && SEVERITIES[code]) || 'secondary';
}

export const ALL_USER_STATUS_CODES = [1, 2, 3, 4, 5];

export const USER_STATUS_OPTIONS = ALL_USER_STATUS_CODES.map((code) => ({ label: statusLabel(code), value: code }));
