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
  usersCount: number;
  permissionsCount: number;
  createdAt: string | null;
  createdBy: UserMinimal | null;
  users: UserOption[];
  permissions: PermissionOption[];
}

/** appKey NÃO vai no body - o backend resolve pela claim app_key do client autenticado (ver
 *  GroupsController#resolveAppKey), sempre 'nimbusauth' pro client nimbusauth-web. */
export interface GroupInput {
  name: string;
  description: string;
}

/** Espelha GroupsFilter (domain/filter/GroupsFilter.java) - só o campo usado pela tela. */
export interface GroupsFilter {
  appKey: string;
}
