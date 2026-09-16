/** Espelha o JSON normalizado devolvido por /internal/email-log/search de cada app satélite (ver
 *  InternalEmailLogController de cada um) e repassado cru pelo AppEmailLogController do
 *  NimbusAuthServer - os 4 satélites (CardSync/NimbusFlow/NimbusDesk/NimbusNovax) já convergem
 *  pro mesmo formato na origem, apesar de guardar status/eventType de formas bem diferentes
 *  internamente (Integer code vs enum String vs texto livre). */
export interface AppEmailLogItem {
  recipients: string;
  subject: string;
  template: string;
  status: string | null;
  eventType: string | null;
  errorMessage: string | null;
  sentAt: string | null;
}

export interface AppEmailLogPage {
  content: AppEmailLogItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AppEmailLogSearchParams {
  page: number;
  size: number;
  recipient?: string;
  subject?: string;
  eventType?: string;
  status?: string;
  sentAtFrom?: string;
  sentAtTo?: string;
}
