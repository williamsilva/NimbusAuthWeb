import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';

/** Protege as rotas administrativas - sem token válido, manda pro /oauth2/authorize (ver
 *  AuthService#startLogin) guardando a rota atual pra voltar depois do login. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);

  if (auth.isAuthenticated()) {
    return true;
  }

  await auth.startLogin(state.url);
  return false;
};
