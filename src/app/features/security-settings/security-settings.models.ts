export interface PasswordSettings {
  minLength: number;
  historySize: number;
  failIfNoExpirationData: boolean;
  ruleDigit: boolean;
  ruleUpper: boolean;
  ruleSymbol: boolean;
  ruleLower: boolean;
  ruleNoWhitespace: boolean;
  ruleCommon: boolean;
  ruleNoUsername: boolean;
  ruleNoSequence: boolean;
  ruleNoRepetition: boolean;
  sequenceLen: number;
  maxSameInRow: number;
  expirationEnabled: boolean;
  expirationWarnDays: number;
  expirationExpireDays: number;
  inviteTtl: string;
  resetTtl: string;
  resetRateLimitEnabled: boolean;
  resetRateLimitMaxRequests: number;
  resetRateLimitWindow: string;
  commonPasswords: string[];
}

export interface LockoutRule {
  attempts: number;
  duration: string;
}

export interface LockoutSettings {
  enabled: boolean;
  extendWhenLocked: boolean;
  rules: LockoutRule[];
}

export interface IpRateLimitSettings {
  enabled: boolean;
  maxAttempts: number;
  window: string;
}

export interface TokenSettings {
  /** Duration ISO-8601 (ex: "PT2H") - único campo com efeito dinâmico de verdade (sessões novas
   *  usam o valor atualizado sem restart, ver EmailSettingsService no backend). */
  sessionTimeout: string;
  /** Default global usado quando um App não tem TTL próprio (ver tela Apps) - só afeta Apps
   *  criados/atualizados DEPOIS da mudança (limitação do Spring Authorization Server). */
  accessTokenTtl: string;
  refreshTokenTtl: string;
}

export interface SecuritySettings {
  password: PasswordSettings;
  lockout: LockoutSettings;
  ipRateLimit: IpRateLimitSettings;
  token: TokenSettings;
  loginDefaultTarget: string | null;
  protectedUsernames: string[];
}
