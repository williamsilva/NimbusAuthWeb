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
}

export interface AppUpdateInput {
  name: string;
  description: string | null;
  redirectUri: string;
  postLogoutRedirectUris: string[];
  allowedOrigin: string | null;
  scopes: string[];
  active: boolean;
}

/** Espelha o PagedModel (HATEOAS) devolvido por POST /api/v1/apps/search. */
export interface HalPagedResponse<T> {
  _embedded?: { content: T[] };
  page: { size: number; totalElements: number; totalPages: number; number: number };
}

export interface ListQueryBody {
  page: number;
  size: number;
  sort: { field: string; order: number }[];
  tableFilters: Record<string, unknown>;
  globalFilter: string | null;
  advanced: Record<string, unknown> | null;
}
