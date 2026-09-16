import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';

export interface Identity {
  userId?: string;
  name?: string;
  username?: string;
  email?: string;
  groups?: string[];
  permissions?: string[];
}

/** Identidade do usuário logado, derivada dos claims do access token (ver
 *  AuthService.claims/JwtClaimsCustomizer) - alimenta NIMBUS_SIDEBAR_HOST/NIMBUS_TOPBAR_HOST.me
 *  (avatar/iniciais) e a tela de Perfil (grupos/permissões, sem round-trip nenhum - já vêm no
 *  token). Dados mais completos (documento, datas, status) exigem GET /api/v1/me/profile, ver
 *  UsersApiService.getMyProfile. */
@Injectable({ providedIn: 'root' })
export class MeStore {
  private readonly auth = inject(AuthService);

  readonly me = computed<Identity | null>(() => {
    const claims = this.auth.claims();
    if (!claims?.username) return null;

    return {
      userId: claims.userId ?? undefined,
      name: claims.name ?? claims.username,
      username: claims.username,
      groups: claims.groups,
      permissions: claims.permissions,
    };
  });
}
