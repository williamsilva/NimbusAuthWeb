import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslateModule } from '@ngx-translate/core';

import { MeStore } from '../../../core/auth/me.store';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ErrorMsgComponent } from '../../../shared/error-msg/error-msg.component';
import { AccountPasswordService, PasswordRulesViewModel } from '../account-password.service';

function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const newPasswordControl = group.get('newPassword');
    const confirmPasswordControl = group.get('confirmPassword');

    const newPassword = newPasswordControl?.value ?? '';
    const confirmPassword = confirmPasswordControl?.value ?? '';

    if (!confirmPasswordControl) return null;

    if (!newPassword || !confirmPassword) {
      confirmPasswordControl.setErrors(null);
      return null;
    }

    if (newPassword !== confirmPassword) {
      confirmPasswordControl.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    confirmPasswordControl.setErrors(null);
    return null;
  };
}

type PolicyRuleState = 'idle' | 'valid' | 'invalid';
type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';
type Severity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

interface PolicyRuleVm {
  code: string;
  message: string;
  state: PolicyRuleState;
}

/** Tela "Trocar Senha" (/security/account/password) - mesmo destino que o TopbarComponent
 *  compartilhado navega ao clicar em "Trocar senha" no menu de conta. Valida a senha nova contra
 *  a política ao vivo (POST /api/password/policy/check, público - reflete a mesma validação que
 *  o backend aplica de verdade em PUT /api/v1/me/password/change). Visual (cards numerados de
 *  resumo, barra de força, grid de regras com ícone de estado) espelha o mesmo padrão já usado no
 *  CardSyncWeb (account-password.component.scss). */
@Component({
  standalone: true,
  selector: 'app-account-password-page',
  styleUrl: './account-password.component.scss',
  templateUrl: './account-password.component.html',
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    DividerModule,
    FloatLabel,
    PasswordModule,
    TagModule,
    ErrorMsgComponent,
    ProgressSpinnerModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
})
export class AccountPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly meStore = inject(MeStore);
  private readonly location = inject(Location);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(AccountPasswordService);
  private readonly i18n = inject(I18nService);

  readonly saving = signal(false);
  readonly loadingPolicy = signal(false);
  readonly loadingInitialPolicy = signal(true);
  readonly bannerError = signal<string | null>(null);

  readonly minLen = signal<number | null>(null);
  readonly policyRules = signal<PolicyRuleVm[]>([]);

  readonly me = computed(() => this.meStore.me());

  readonly displayName = computed(
    () => this.me()?.name?.trim() || this.me()?.username?.trim() || this.i18n.tUi('accountPassword.defaultUserName', 'Usuário'),
  );
  readonly displayUsername = computed(() => this.me()?.username?.trim() || '-');

  readonly validRulesCount = computed(() => this.policyRules().filter((r) => r.state === 'valid').length);
  readonly invalidRulesCount = computed(() => this.policyRules().filter((r) => r.state === 'invalid').length);
  readonly totalRulesCount = computed(() => this.policyRules().length);

  readonly passwordStrengthPercent = computed(() => {
    const total = this.totalRulesCount();
    if (!total) return 0;

    return Math.round((this.validRulesCount() / total) * 100);
  });

  readonly passwordStrengthLevel = computed<PasswordStrengthLevel>(() => {
    const password = this.form.controls.newPassword.value?.trim() ?? '';
    const percent = this.passwordStrengthPercent();

    if (!password) return 'empty';
    if (percent <= 33) return 'weak';
    if (percent <= 66) return 'medium';
    return 'strong';
  });

  readonly strengthSeverity = computed<Severity>(() => {
    switch (this.passwordStrengthLevel()) {
      case 'weak':
        return 'warn';
      case 'medium':
        return 'info';
      case 'strong':
        return 'success';
      default:
        return 'contrast';
    }
  });

  readonly strengthLabel = computed(() => {
    this.i18n.appliedLang(); // dependência de leitura - reavalia quando o idioma mudar
    switch (this.passwordStrengthLevel()) {
      case 'weak':
        return this.i18n.tUi('accountPassword.strength.weak', 'Fraca');
      case 'medium':
        return this.i18n.tUi('accountPassword.strength.medium', 'Média');
      case 'strong':
        return this.i18n.tUi('accountPassword.strength.strong', 'Forte');
      default:
        return this.i18n.tUi('accountPassword.strength.empty', 'Não informada');
    }
  });

  readonly rulesMetCountLabel = computed(() =>
    this.i18n.tUi('accountPassword.rulesMetCount', { valid: this.validRulesCount(), total: this.totalRulesCount() }),
  );

  readonly policySummarySeverity = computed<Severity>(() => {
    if (this.invalidRulesCount() > 0) return 'danger';
    if (this.validRulesCount() > 0) return 'success';
    return 'contrast';
  });

  readonly form = this.fb.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator()] },
  );

  readonly canSubmit = computed(() => {
    const hasInvalidRule = this.policyRules().some((r) => r.state === 'invalid');
    return this.form.valid && !this.saving() && !this.loadingPolicy() && !this.loadingInitialPolicy() && !hasInvalidRule;
  });

  constructor() {
    // Não usa effect() aqui de propósito: FormControl.value não é um signal (não cria
    // dependência reativa nenhuma pro Angular rastrear), então um effect() só rodaria essa
    // checagem UMA vez, na criação - e escrever em signal (loadingInitialPolicy.set) durante a
    // execução de um effect() é bloqueado pelo Angular (NG0600). Chamada direta resolve os dois
    // problemas: dispara certo no início e não corre risco de escrita bloqueada.
    const initialPassword = this.form.controls.newPassword.value?.trim() ?? '';
    if (initialPassword) {
      this.validatePolicyLive();
    } else {
      this.loadInitialPolicy();
    }

    merge(
      this.form.controls.newPassword.valueChanges,
      this.form.controls.confirmPassword.valueChanges,
    )
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.validatePolicyLive());
  }

  back(): void {
    this.location.back();
  }

  submit(): void {
    this.bannerError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);

    this.service
      .changeMyPassword({
        currentPassword: raw.currentPassword ?? '',
        newPassword: raw.newPassword ?? '',
        confirmPassword: raw.confirmPassword ?? '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toast.add({
            severity: 'success',
            summary: this.i18n.tUi('accountPassword.toastChanged.summary', 'Senha alterada'),
            detail: this.i18n.tUi('accountPassword.toastChanged.detail', 'Sua senha foi atualizada com sucesso.'),
          });
          this.form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.resetToIdlePolicy();
        },
        error: (err) => {
          this.bannerError.set(err?.error?.message || this.i18n.tUi('accountPassword.errorFallback', 'Não foi possível alterar a senha. Confira a senha atual e tente novamente.'));
        },
      });
  }

  initials(value?: string | null): string {
    const text = (value || '').trim();
    if (!text) return '?';

    const parts = text.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  private applyPolicyResponse(res: PasswordRulesViewModel, mode: 'idle' | 'checked'): void {
    this.minLen.set(res.minLen ?? null);

    const rules = (res.rules ?? []).map((rule) => ({
      code: rule.code,
      message: rule.label || rule.code,
      state: this.mapRuleState(rule.state, mode),
    })) satisfies PolicyRuleVm[];

    this.policyRules.set(rules);
  }

  private mapRuleState(serverState: string | null | undefined, mode: 'idle' | 'checked'): PolicyRuleState {
    if (mode === 'idle') return 'idle';

    switch (serverState) {
      case 'OK':
        return 'valid';
      case 'FAIL':
        return 'invalid';
      default:
        return 'idle';
    }
  }

  private validatePolicyLive(): void {
    const password = this.form.controls.newPassword.value?.trim() ?? '';
    const confirmPassword = this.form.controls.confirmPassword.value?.trim() ?? '';
    const username = this.meStore.me()?.username ?? null;

    if (!password) {
      this.resetToIdlePolicy();
      return;
    }

    this.loadingPolicy.set(true);

    this.service
      .checkPolicy({ password, confirmPassword: confirmPassword || null, username })
      .pipe(finalize(() => this.loadingPolicy.set(false)))
      .subscribe({
        next: (res) => this.applyPolicyResponse(res, 'checked'),
        error: () => this.loadingPolicy.set(false),
      });
  }

  private loadInitialPolicy(): void {
    this.loadingInitialPolicy.set(true);

    this.service
      .loadPolicy()
      .pipe(finalize(() => this.loadingInitialPolicy.set(false)))
      .subscribe({
        next: (res) => this.applyPolicyResponse(res, 'idle'),
        error: () => this.policyRules.set([]),
      });
  }

  private resetToIdlePolicy(): void {
    this.service.loadPolicy().subscribe({
      next: (res) => this.applyPolicyResponse(res, 'idle'),
      error: () => undefined,
    });
  }
}
