import { Injectable } from '@angular/core';

/** Este app não tem controle de permissão client-side hoje (a proteção real é 100% server-side,
 *  via JWT/CheckSecurity de cada endpoint) - canAccess() sempre libera, só existe pra satisfazer o
 *  contrato NimbusSidebarHost.canAccess da lib compartilhada sem introduzir um gate novo. */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  // Assinatura fixada pelo contrato NimbusSidebarHost.canAccess da lib compartilhada; este app
  // não filtra por permissão client-side.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canAccess(required: string[], requireAll: boolean): boolean {
    return true;
  }
}
