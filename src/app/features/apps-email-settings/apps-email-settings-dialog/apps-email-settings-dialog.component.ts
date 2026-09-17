import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { FloatLabel } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';

import { AppsEmailSettingsApiService } from '../apps-email-settings.api.service';
import { EmailSettings } from '../../email-settings/email-settings.models';
import { EmailSettingsApiService } from '../../email-settings/email-settings.api.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ErrorMsgComponent } from '../../../shared/error-msg/error-msg.component';

/** Edita a config de e-mail de UM app por vez (satélite OU o próprio NimbusAuth), aberto a partir
 *  da tela unificada "Configurações de E-mail" (apps-email-settings-list). Quando `appKey` é
 *  "nimbusauth", usa `EmailSettingsApiService` (endpoint próprio, `/v1/email/settings`, sem
 *  parâmetro de app) em vez do proxy `AppsEmailSettingsApiService` (que chama `/internal/
 *  email-settings` de cada satélite via M2M e não conhece o próprio NimbusAuth como alvo) - mesmo
 *  adaptador client-side já usado na fusão das telas de Auditoria de E-mail. PUT sempre envia a
 *  configuração inteira, exceto brevoApiKey/smtpPassword: vazios significam "não mudar o segredo
 *  salvo" - nunca reenviamos o valor mascarado de volta. */
@Component({
  standalone: true,
  selector: 'app-apps-email-settings-dialog',
  templateUrl: './apps-email-settings-dialog.component.html',
  styleUrl: './apps-email-settings-dialog.component.scss',
  imports: [
    ButtonModule,
    CheckboxModule,
    DialogModule,
    ErrorMsgComponent,
    FieldsetModule,
    FloatLabel,
    InputNumberModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
})
export class AppsEmailSettingsDialogComponent {
  visible = input.required<boolean>();
  appKey = input<string | null>(null);
  appName = input<string | null>(null);

  @Output() visibleChange = new EventEmitter<boolean>();

  private static readonly NIMBUS_AUTH_APP_KEY = 'nimbusauth';

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppsEmailSettingsApiService);
  private readonly ownApi = inject(EmailSettingsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly allowFakeImpl = signal(false);

  private lastLoadedAppKey: string | null = null;

  readonly implOptions = computed(() => {
    this.i18n.appliedLang(); // dependência de leitura - reavalia as labels quando o idioma mudar
    const all = [
      { label: this.i18n.tUi('emailSettings.implOptions.fake', 'Simulado (não envia de verdade)'), value: 'fake' },
      { label: this.i18n.tUi('emailSettings.implOptions.apiKey', 'API (Brevo)'), value: 'api_key' },
      { label: this.i18n.tUi('emailSettings.implOptions.smtp', 'SMTP'), value: 'smtp' },
    ];
    return this.allowFakeImpl() ? all : all.filter((o) => o.value !== 'fake');
  });

  readonly form = this.fb.nonNullable.group({
    impl: ['fake', Validators.required],
    fromName: ['', [Validators.required, Validators.maxLength(255)]],
    fromEmail: ['', [Validators.required, Validators.maxLength(255)]],
    brevoApiKey: [''],
    brevoBaseUrl: ['', Validators.maxLength(255)],
    smtpHost: ['', Validators.maxLength(255)],
    smtpPort: [587],
    smtpUsername: ['', Validators.maxLength(255)],
    smtpPassword: [''],
    smtpAuth: [true],
    smtpStarttls: [false],
    smtpSsl: [false],
  });

  private readonly implValue = toSignal(this.form.controls.impl.valueChanges, {
    initialValue: this.form.controls.impl.value,
  });
  readonly showBrevoFieldset = computed(() => this.implValue() === 'api_key');
  readonly showSmtpFieldset = computed(() => this.implValue() === 'smtp');

  constructor() {
    effect(() => {
      const appKey = this.appKey();
      if (!this.visible() || !appKey) {
        return;
      }
      if (this.lastLoadedAppKey === appKey) {
        return;
      }
      this.lastLoadedAppKey = appKey;
      this.load(appKey);
    });
  }

  private load(appKey: string): void {
    this.loading.set(true);
    const request$ =
      appKey === AppsEmailSettingsDialogComponent.NIMBUS_AUTH_APP_KEY ? this.ownApi.get() : this.api.get(appKey);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private applySettings(settings: EmailSettings): void {
    this.allowFakeImpl.set(settings.allowFakeImpl);
    this.form.patchValue({
      impl: settings.impl ?? 'fake',
      fromName: settings.fromName ?? '',
      fromEmail: settings.fromEmail ?? '',
      // brevoApiKey/smtpPassword: NÃO preenche com o valor mascarado - o campo fica vazio,
      // deixando claro que digitar aqui troca o segredo, e deixar vazio preserva o atual.
      brevoApiKey: '',
      brevoBaseUrl: settings.brevoBaseUrl ?? '',
      smtpHost: settings.smtpHost ?? '',
      smtpPort: settings.smtpPort ?? 587,
      smtpUsername: settings.smtpUsername ?? '',
      smtpPassword: '',
      smtpAuth: settings.smtpAuth ?? true,
      smtpStarttls: settings.smtpStarttls ?? false,
      smtpSsl: settings.smtpSsl ?? false,
    });
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.toast.add({
        severity: 'warn',
        summary: this.i18n.tUi('emailSettings.toastInvalid.summary', 'Formulário inválido'),
        detail: this.i18n.tUi('emailSettings.toastInvalid.detail', 'Verifique os campos destacados.'),
      });
      return;
    }

    const appKey = this.appKey();
    if (!appKey) {
      return;
    }

    const v = this.form.getRawValue();
    const payload = {
      impl: v.impl,
      fromName: v.fromName.trim(),
      fromEmail: v.fromEmail.trim(),
      brevoApiKey: v.brevoApiKey.trim() || null,
      brevoBaseUrl: v.brevoBaseUrl.trim() || null,
      brevoPort: null,
      brevoUsername: null,
      smtpHost: v.smtpHost.trim() || null,
      smtpPort: v.smtpPort,
      smtpUsername: v.smtpUsername.trim() || null,
      smtpPassword: v.smtpPassword.trim() || null,
      smtpAuth: v.smtpAuth,
      smtpStarttls: v.smtpStarttls,
      smtpSsl: v.smtpSsl,
    };

    this.saving.set(true);
    const request$ =
      appKey === AppsEmailSettingsDialogComponent.NIMBUS_AUTH_APP_KEY
        ? this.ownApi.update(payload)
        : this.api.update(appKey, payload);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.saving.set(false);
        this.toast.add({
          severity: 'success',
          summary: this.i18n.tUi('common.success', 'Sucesso'),
          detail: this.i18n.tUi(
            'appsEmailSettings.dialog.toastUpdated',
            { name: this.appName() },
            `Configurações de e-mail de "${this.appName()}" atualizadas.`,
          ),
        });
      },
      error: () => this.saving.set(false),
    });
  }

  close(): void {
    this.lastLoadedAppKey = null;
    this.visibleChange.emit(false);
  }
}
