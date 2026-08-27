export interface UserMinimal {
  id: string;
  name: string;
  userName: string;
}

/** Grupo do usuário, já com o appKey a que pertence - nb_groups é escopado por app_key mas
 *  nb_users é global (compartilhado entre cardsync/nimbusflow/nimbusnovax/nimbusauth), então um
 *  mesmo usuário pode ter grupos de vários apps ao mesmo tempo. Ver users-form-dialog. */
export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  appKey: string;
}

/** status: enum StatusUserEnum do backend - NULL(0), ACTIVE(1), INACTIVE(2), BLOCKED(3),
 *  DISABLED(4), PENDING_PASSWORD(5). Ver user-status.ts. */
export interface UserModel {
  id: string;
  name: string;
  status: number;
  userName: string;
  document: string;
  createdAt: string | null;
  lastLoginAt: string | null;
  blockedUntil: string | null;
  passwordExpiresAt: string | null;
  createdBy: UserMinimal | null;
  groups: UserGroup[];
}

export interface UserInput {
  userName: string;
  name: string;
  document: string;
  groupIds: string[];
}

export interface UserOption {
  id: string;
  name: string;
  userName: string;
}

/** Estado persistido do painel de filtros avançados (localStorage) - datas em string ISO (não dá
 *  pra serializar Date direto em JSON.stringify de forma restaurável sem reviver customizado). */
export interface UsersFiltersState {
  name: string;
  userName: string;
  document: string;
  status: string[] | null;
  createdBy: string[] | null;
  createdAtRange: [string, string] | null;
  lastLoginAtRange: [string, string] | null;
  blockedUntilRange: [string, string] | null;
  passwordExpiresAtRange: [string, string] | null;
}

/** Espelha UsersFilter (domain/filter/UsersFilter.java) - enviado em `advanced`. groupAppKey
 *  sempre fixo em APP_KEY (não é escolhido pelo usuário, ver UsersApiService). status é a lista de
 *  NOMES do enum (ACTIVE, PENDING_PASSWORD, ...), não os códigos. */
export interface UsersAdvancedFilters {
  name?: string;
  userName?: string;
  document?: string;
  groupAppKey?: string;
  status?: string[];
  createdBy?: string[];
  createdAtFrom?: string;
  createdAtTo?: string;
  lastLoginAtFrom?: string;
  lastLoginAtTo?: string;
  blockedUntilFrom?: string;
  blockedUntilTo?: string;
  passwordExpiresAtFrom?: string;
  passwordExpiresAtTo?: string;
}
