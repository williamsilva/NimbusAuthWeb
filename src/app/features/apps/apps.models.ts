export interface AppModel {
  id: string;
  appKey: string;
  name: string;
  description: string | null;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUris: string[];
  allowedOrigin: string | null;
  scopes: string[];
  active: boolean;
  /** Duration ISO-8601 (ex: "PT10M") ou null - null usa o default global do NimbusAuth. */
  accessTokenTtl: string | null;
  refreshTokenTtl: string | null;
  createdAt: string | null;
  createdBy: { id: string; name: string; userName: string } | null;
}

export interface AppSecretModel {
  app: AppModel;
  clientSecret: string;
}

export interface AppCreateInput {
  appKey: string;
  name: string;
  description: string | null;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUris: string[];
  allowedOrigin: string | null;
  scopes: string[];
  accessTokenTtl: string | null;
  refreshTokenTtl: string | null;
}

export interface AppUpdateInput {
  name: string;
  description: string | null;
  redirectUri: string;
  postLogoutRedirectUris: string[];
  allowedOrigin: string | null;
  scopes: string[];
  active: boolean;
  accessTokenTtl: string | null;
  refreshTokenTtl: string | null;
}

/** Estado persistido do painel de filtros avançados (localStorage). */
export interface AppsFiltersState {
  name: string;
  appKey: string;
  active: boolean | null;
  createdBy: string[] | null;
  createdAtRange: [string, string] | null;
}

/** Espelha AppsFilter (domain/filter/AppsFilter.java) - enviado em `advanced`. */
export interface AppsAdvancedFilters {
  name?: string;
  appKey?: string;
  active?: boolean;
  createdBy?: string[];
  createdAtFrom?: string;
  createdAtTo?: string;
}
