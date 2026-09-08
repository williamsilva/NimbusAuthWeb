/** Espelha EmailLogStatusEnum/EmailLogEventTypeEnum (NimbusCommonsLegacy, compartilhado entre
 *  todos os apps Nimbus). Código (número) é o formato usado por EmailLogModel.status/eventType
 *  vindo como STRING do nome do enum (Jackson serializa enum pelo nome, sem @JsonValue custom) e
 *  pelo p-columnFilter (whitelist enumAsIntegerCode - EmailLogAllowedFields). Só PASSWORD_RESET e
 *  FIRST_PASSWORD fazem sentido aqui - CHARGEBACK_DETECTED é exclusivo do CardSync (nunca gerado
 *  pelo NimbusAuthServer), omitido das opções de filtro pra não confundir. */
export type EmailLogStatusName = 'NULL' | 'SENT' | 'FAILED';
export type EmailLogEventTypeName = 'NULL' | 'PASSWORD_RESET' | 'FIRST_PASSWORD' | 'CHARGEBACK_DETECTED';

const STATUS_NAME_TO_CODE: Record<EmailLogStatusName, number> = { NULL: 0, SENT: 1, FAILED: 2 };
const EVENT_TYPE_NAME_TO_CODE: Record<EmailLogEventTypeName, number> = {
  NULL: 0,
  PASSWORD_RESET: 1,
  FIRST_PASSWORD: 2,
  CHARGEBACK_DETECTED: 3,
};

const STATUS_LABELS: Record<number, string> = { 1: 'Enviado', 2: 'Falhou' };
const STATUS_SEVERITIES: Record<number, 'success' | 'danger'> = { 1: 'success', 2: 'danger' };

const EVENT_TYPE_LABELS: Record<number, string> = {
  1: 'Reset de senha',
  2: 'Primeiro acesso',
  3: 'Chargeback detectado',
};

export function statusCode(name: string): number | null {
  return STATUS_NAME_TO_CODE[name as EmailLogStatusName] ?? null;
}

export function statusName(code: number | null | undefined): EmailLogStatusName | null {
  const entry = Object.entries(STATUS_NAME_TO_CODE).find(([, c]) => c === code);
  return (entry?.[0] as EmailLogStatusName) ?? null;
}

export function statusLabel(code: number | null | undefined): string {
  return (code != null && STATUS_LABELS[code]) || '—';
}

export function statusSeverity(code: number | null | undefined): 'success' | 'danger' | 'secondary' {
  return (code != null && STATUS_SEVERITIES[code]) || 'secondary';
}

export function eventTypeCode(name: string): number | null {
  return EVENT_TYPE_NAME_TO_CODE[name as EmailLogEventTypeName] ?? null;
}

export function eventTypeName(code: number | null | undefined): EmailLogEventTypeName | null {
  const entry = Object.entries(EVENT_TYPE_NAME_TO_CODE).find(([, c]) => c === code);
  return (entry?.[0] as EmailLogEventTypeName) ?? null;
}

export function eventTypeLabel(code: number | null | undefined): string {
  return (code != null && EVENT_TYPE_LABELS[code]) || '—';
}

/** Só os 2 eventos que o NimbusAuthServer de fato gera (convite de 1º acesso / reset de senha). */
export const EMAIL_LOG_EVENT_TYPE_OPTIONS = [
  { label: 'Reset de senha', value: 1 },
  { label: 'Primeiro acesso', value: 2 },
];

export const EMAIL_LOG_STATUS_OPTIONS = [
  { label: 'Enviado', value: 1 },
  { label: 'Falhou', value: 2 },
];
