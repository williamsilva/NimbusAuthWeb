import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

import { SecuritySettingsApiService } from './security-settings.api.service';
import { SecuritySettings } from './security-settings.models';

function splitList(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
}

/** Tela única (form, sem lista/dialog) - política de senha/lockout/rate-limit por IP/etc, mesmo
 *  padrão "singleton settings" de EmailSettingsController/SecuritySettingsController no backend.
 *  PUT sempre envia a configuração inteira (não um diff parcial). */
@Component({
  standalone: true,
  selector: 'app-security-settings-page',
  templateUrl: './security-settings-page.component.html',
  styleUrl: './security-settings-page.component.scss',
  imports: [ButtonModule, CheckboxModule, InputNumberModule, InputTextModule, TabsModule, TextareaModule, ReactiveFormsModule],
})
export class SecuritySettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SecuritySettingsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    password: this.fb.nonNullable.group({
      minLength: [8, Validators.required],
      historySize: [3, Validators.required],
      failIfNoExpirationData: [true],
      ruleDigit: [true],
      ruleUpper: [true],
      ruleSymbol: [true],
      ruleLower: [false],
      ruleNoWhitespace: [true],
      ruleCommon: [true],
      ruleNoUsername: [true],
      ruleNoSequence: [true],
      ruleNoRepetition: [true],
      sequenceLen: [4, Validators.required],
      maxSameInRow: [4, Validators.required],
      expirationEnabled: [true],
      expirationWarnDays: [10, Validators.required],
      expirationExpireDays: [90, Validators.required],
      inviteTtl: ['PT24H', Validators.required],
      resetTtl: ['PT15M', Validators.required],
      resetRateLimitEnabled: [true],
      resetRateLimitMaxRequests: [3, Validators.required],
      resetRateLimitWindow: ['PT15M', Validators.required],
      commonPasswords: [''],
    }),
    lockout: this.fb.nonNullable.group({
      enabled: [true],
      extendWhenLocked: [false],
      rules: this.fb.array<FormGroup<{ attempts: FormControl<number>; duration: FormControl<string> }>>([]),
    }),
    ipRateLimit: this.fb.nonNullable.group({
      enabled: [true],
      maxAttempts: [30, Validators.required],
      window: ['PT15M', Validators.required],
    }),
    token: this.fb.nonNullable.group({
      sessionTimeout: ['PT2H', Validators.required],
      accessTokenTtl: ['PT10M', Validators.required],
      refreshTokenTtl: ['P30D', Validators.required],
    }),
    loginDefaultTarget: [''],
    protectedUsernames: ['owner,system'],
  });

  get lockoutRules(): FormArray {
    return this.form.controls.lockout.controls.rules;
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.get().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private applySettings(settings: SecuritySettings): void {
    this.form.patchValue({
      password: { ...settings.password, commonPasswords: (settings.password.commonPasswords ?? []).join(',') },
      lockout: { enabled: settings.lockout.enabled, extendWhenLocked: settings.lockout.extendWhenLocked },
      ipRateLimit: settings.ipRateLimit,
      token: settings.token,
      loginDefaultTarget: settings.loginDefaultTarget ?? '',
      protectedUsernames: (settings.protectedUsernames ?? []).join(','),
    });

    this.lockoutRules.clear();
    for (const rule of settings.lockout.rules) {
      this.lockoutRules.push(
        this.fb.nonNullable.group({
          attempts: [rule.attempts, Validators.required],
          duration: [rule.duration, Validators.required],
        }),
      );
    }
  }

  addRule(): void {
    this.lockoutRules.push(
      this.fb.nonNullable.group({
        attempts: [5, Validators.required],
        duration: ['PT15M', Validators.required],
      }),
    );
  }

  removeRule(index: number): void {
    this.lockoutRules.removeAt(index);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.lockoutRules.length === 0) {
      this.toast.add({ severity: 'warn', summary: 'Formulário inválido', detail: 'Verifique os campos destacados - é preciso pelo menos 1 regra de bloqueio.' });
      return;
    }

    const v = this.form.getRawValue();
    const payload: SecuritySettings = {
      password: { ...v.password, commonPasswords: splitList(v.password.commonPasswords) },
      lockout: {
        enabled: v.lockout.enabled,
        extendWhenLocked: v.lockout.extendWhenLocked,
        rules: v.lockout.rules,
      },
      ipRateLimit: v.ipRateLimit,
      token: v.token,
      loginDefaultTarget: v.loginDefaultTarget?.trim() || null,
      protectedUsernames: splitList(v.protectedUsernames),
    };

    this.saving.set(true);
    this.api.update(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Configurações de segurança atualizadas.' });
      },
      error: () => this.saving.set(false),
    });
  }
}
