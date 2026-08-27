export interface UserMinimal {
  id: string;
  name: string;
  userName: string;
}

export interface UserOption {
  id: string;
  name: string;
  userName: string;
}

export interface PermissionOption {
  id: string;
  name: string;
  description: string | null;
  appKey: string;
}

/** GET /api/v1/groups/options?appKey= - único endpoint de grupo que expõe appKey (GroupModel,
 *  devolvido por /search e /{id}, não tem esse campo). */
export interface GroupOption {
  id: string;
  name: string;
  description: string | null;
  appKey: string;
}

export interface GroupModel {
  id: string;
  name: string;
  description: string | null;
  appKey: string;
  usersCount: number;
  permissionsCount: number;
  createdAt: string | null;
  createdBy: UserMinimal | null;
  users: UserOption[];
  permissions: PermissionOption[];
}

/** appKey só é considerado na CRIAÇÃO, e só tem efeito vindo do client nimbusauth-web (painel
 *  central de administração) - qualquer outro client (cardsync-bff, ...) ignora este campo e cria
 *  sempre no próprio app (ver GroupsController#resolveAppKey). Imutável depois de criado - nunca
 *  enviado no update. */
export interface GroupInput {
  name: string;
  description: string;
  appKey?: string;
}

/** Estado persistido do painel de filtros avançados (localStorage). */
export interface GroupsFiltersState {
  name: string;
  description: string;
  appKey: string | null;
  createdBy: string[] | null;
  createdAtRange: [string, string] | null;
}

/** Espelha GroupsFilter (domain/filter/GroupsFilter.java) - enviado em `advanced`. Diferente do
 *  CardSyncWeb (onde appKey é sempre fixo internamente), aqui é um filtro real escolhido pelo
 *  usuário no painel avançado - a tela é um painel central multi-app. */
export interface GroupsAdvancedFilters {
  name?: string;
  description?: string;
  appKey?: string;
  createdBy?: string[];
  createdAtFrom?: string;
  createdAtTo?: string;
}
