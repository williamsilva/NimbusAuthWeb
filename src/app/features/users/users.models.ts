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
 *  DISABLED(4), PENDING_PASSWORD(5). */
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

/** Espelha UsersFilter (domain/filter/UsersFilter.java) - só os campos usados pela tela. */
export interface UsersFilter {
  groupAppKey: string;
  status: number[] | null;
}
