/** Espelha o JSON normalizado devolvido por /internal/email-log/search de cada app satélite (ver
 *  InternalEmailLogController de cada um) e repassado cru pelo AppEmailLogController do
 *  NimbusCoreServer - os 4 satélites (CardSync/NimbusFlow/NimbusDesk/NimbusNovax) já convergem
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
  /** Corpo HTML completo - ausente/null em CardSync (única origem que não guarda essa coluna
   *  hoje, ver cs_email_log) e em registros antigos das demais origens. */
  body?: string | null;
  /** Nomes dos arquivos anexados ao e-mail, separados por ", " - null quando o e-mail não teve
   *  anexo. Só o NimbusFlow preenche esta coluna hoje (nimbus-commons-server 0.6.1, ver
   *  EmailLogEntity#attachmentFilenames); ausente (undefined) nos demais satélites, que ainda não
   *  atualizaram a biblioteca. */
  attachmentFilenames?: string | null;
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
  /** Um só campo (não "multiple") - o proxy (AppEmailLogController) e os 5 endpoints internos dos
   *  apps satélite só aceitam 1 sortField/sortOrder por vez (ver plano de ordenação cross-repo). */
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}
