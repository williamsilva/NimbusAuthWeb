/** Espelha EmailLogModel (bff/controller/v1/representation/model/EmailLogModel.java). status/
 *  eventType chegam como o NOME do enum (Jackson serializa por nome, sem @JsonValue custom) - ver
 *  email-log-status.ts pros mapeamentos nome<->código. body é o corpo HTML completo do e-mail -
 *  null em registros anteriores a 2026-08-19 (coluna adicionada depois, sem reconstrução
 *  retroativa). Não há campo "quem disparou" exposto pelo Model hoje (existe na entidade, mas o
 *  assembler do backend não mapeia). */
export interface EmailLogModel {
  id: string;
  status: string | null;
  eventType: string | null;
  subject: string;
  template: string;
  recipient: string;
  errorMessage: string | null;
  body: string | null;
  sentAt: string;
}

/** Estado persistido do painel de filtros avançados (localStorage). */
export interface EmailLogFiltersState {
  subject: string;
  template: string;
  recipient: string;
  status: string[] | null;
  eventType: string[] | null;
  sentAtRange: [string, string] | null;
}

/** Espelha EmailLogFilter (domain/filter/EmailLogFilter.java) - enviado em `advanced`. status/
 *  eventType são listas de NOMES do enum (não códigos - Jackson desserializa List<EnumX> pelo
 *  nome). recipientAppKey de propósito fora daqui - o NimbusCoreWeb é o dono dos dados (só ele
 *  gera esses logs), sem sentido escopar por app como os outros consumidores via BFF fazem. */
export interface EmailLogAdvancedFilters {
  subject?: string;
  template?: string;
  recipient?: string;
  status?: string[];
  eventType?: string[];
  sentAtFrom?: string;
  sentAtTo?: string;
}
