import { Injectable, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { UserModel } from './users.models';

export type BulkUserActionMode = 'activate' | 'deactivate';

/** Regra de "modo" pra seleção em massa (ativar/inativar) - versão simplificada do
 *  SecurityPermissionPolicy do CardSyncWeb, sem a camada de permissão granular por ação (o
 *  NimbusAuthWeb não tem PermissionService - o backend já protege via CheckSecurity, e esta tela
 *  é restrita ao grupo ADMINISTRADOR do nimbusauth). Mantém só a regra de negócio real: não dá
 *  pra se auto-desativar, e só usuários Ativo/Inativo/Desabilitado entram em ação de lote. */
@Injectable({ providedIn: 'root' })
export class UsersSelectionPolicy {
  private readonly auth = inject(AuthService);

  modeForRow(row: UserModel): BulkUserActionMode | null {
    if (row.status === 1) {
      return this.isCurrentUser(row) ? null : 'deactivate';
    }
    if (row.status === 2 || row.status === 4) {
      return 'activate';
    }
    return null;
  }

  canActivate(row: UserModel): boolean {
    return row.status === 2 || row.status === 4;
  }

  canDeactivate(row: UserModel): boolean {
    return row.status === 1 && !this.isCurrentUser(row);
  }

  private isCurrentUser(row: UserModel): boolean {
    const current = this.normalize(this.auth.currentUsername());
    const rowName = this.normalize(row.userName);
    return !!current && !!rowName && current === rowName;
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }
}
