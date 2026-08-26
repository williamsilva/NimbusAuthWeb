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

export interface SecuritySettings {
  password: PasswordSettings;
  lockout: LockoutSettings;
  ipRateLimit: IpRateLimitSettings;
  loginDefaultTarget: string | null;
  protectedUsernames: string[];
}
