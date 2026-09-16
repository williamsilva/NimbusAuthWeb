import { Injectable, computed, inject } from '@angular/core';

import { AuthService } from './auth.service';

export interface Identity {
  name?: string;
  username?: string;
  email?: string;
}

/** Identidade mínima do usuário logado, derivada do access token já decodificado por
 *  AuthService.currentUsername - só pra alimentar NIMBUS_SIDEBAR_HOST/NIMBUS_TOPBAR_HOST.me
 *  (avatar/iniciais). Sem chamada de rede: este app não tem um endpoint "/me" com nome/e-mail
 *  completos, e o claim "username" já basta pro que a lib exibe. */
@Injectable({ providedIn: 'root' })
export class MeStore {
  private readonly auth = inject(AuthService);

  readonly me = computed<Identity | null>(() => {
    const username = this.auth.currentUsername();
    return username ? { name: username, username } : null;
  });
}
