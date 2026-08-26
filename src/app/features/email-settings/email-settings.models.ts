export interface EmailSettings {
  impl: string;
  /** false em produção - a tela esconde a opção "fake" do seletor quando este campo vem false
   *  (calculado pelo backend a partir do perfil Spring ativo, nunca no frontend). */
  allowFakeImpl: boolean;
  fromName: string;
  fromEmail: string;
  /** Mascarado (só os últimos 4 caracteres) - nunca o segredo em claro. */
  brevoApiKey: string | null;
  brevoBaseUrl: string | null;
  brevoPort: number | null;
  brevoUsername: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  /** Mascarado, mesmo motivo de brevoApiKey acima. */
  smtpPassword: string | null;
  smtpAuth: boolean | null;
  smtpStarttls: boolean | null;
  smtpSsl: boolean | null;
}

/** Mesmo formato de EmailSettings pro PUT - brevoApiKey/smtpPassword vazios/omitidos significam
 *  "não mudar o segredo salvo" (ver EmailSettingsService#update no backend), nunca "apagar". */
export type EmailSettingsUpdate = Omit<EmailSettings, 'allowFakeImpl'>;
