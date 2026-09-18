import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { API } from '../../core/api/api.config';

export type PasswordRuleServerState = 'OK' | 'FAIL' | 'PENDING';

export interface PasswordRuleViewDto {
  code: string;
  label: string;
  state: PasswordRuleServerState;
}

export interface PasswordRulesViewModel {
  ok: boolean;
  minLen: number;
  historySize: number;
  rules: PasswordRuleViewDto[];
}

export interface PasswordCheckRequest {
  password: string;
  confirmPassword?: string | null;
  username?: string | null;
}

export interface ChangeMyPasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Fala direto com o NimbusCoreServer (não é proxy - esse app É o servidor de identidade). Os 2
 *  endpoints de política ficam em /api/password (sem versionamento, público - ver
 *  PolicyPasswordController); o de troca de senha fica em /api/v1/me/password/change (exige JWT,
 *  resolve o usuário pelo próprio token - ver MePasswordChangeController). */
@Injectable({ providedIn: 'root' })
export class AccountPasswordService {
  private readonly http = inject(HttpClient);
  private readonly policyBase = `${environment.apiBaseUrl}/api/password`;
  private readonly meBase = `${API.base}/v1/me`;

  loadPolicy(): Observable<PasswordRulesViewModel> {
    return this.http.get<PasswordRulesViewModel>(`${this.policyBase}/policy`);
  }

  checkPolicy(payload: PasswordCheckRequest): Observable<PasswordRulesViewModel> {
    return this.http.post<PasswordRulesViewModel>(`${this.policyBase}/policy/check`, payload);
  }

  changeMyPassword(payload: ChangeMyPasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.meBase}/password/change`, payload);
  }
}
