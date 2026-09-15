import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { FieldsetModule } from 'primeng/fieldset';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { AppsEmailSettingsApiService } from '../apps-email-settings.api.service';
import { EmailSettings } from '../../email-settings/email-settings.models';

/** Mesmos campos/lógica de EmailSettingsPageComponent (config do PRÓPRIO NimbusAuth), só
 *  parametrizado por appKey e num dialog (não uma página) - edita a config de e-mail de UM app
 *  satélite por vez, lida/gravada remotamente via AppsEmailSettingsApiService (proxy do
 *  NimbusAuthServer pro /internal/email-settings daquele app). PUT sempre envia a configuração
 *  inteira, exceto brevoApiKey/smtpPassword: vazios significam "não mudar o segredo salvo" - nunca
 *  reenviamos o valor mascarado de volta. */
@Component({
  standalone: true,
  selector: 'app-apps-email-settings-dialog',
  templateUrl: './apps-email-settings-dialog.component.html',
  styleUrl: './apps-email-settings-dialog.component.scss',
  imports: [
    ButtonModule,
    CheckboxModule,
    DialogModule,
    FieldsetModule,
    InputNumberModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ReactiveFormsModule,
  ],
})
export class AppsEmailSettingsDialogComponent {
  visible = input.required<boolean>();
  appKey = input<string | null>(null);
  appName = input<string | null>(null);

  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppsEmailSettingsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly allowFakeImpl = signal(false);

  private lastLoadedAppKey: string | null = null;

  readonly implOptions = computed(() => {
    const all = [
      { label: 'Simulado (não envia de verdade)', value: 'fake' },
      { label: 'API (Brevo)', value: 'api_key' },
      { label: 'SMTP', value: 'smtp' },
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
    this.api.get(appKey).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
      this.toast.add({ severity: 'warn', summary: 'Formulário inválido', detail: 'Verifique os campos destacados.' });
      return;
    }

    const appKey = this.appKey();
    if (!appKey) {
      return;
    }

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.update(appKey, {
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
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: `Configurações de e-mail de "${this.appName()}" atualizadas.` });
      },
      error: () => this.saving.set(false),
    });
  }

  close(): void {
    this.lastLoadedAppKey = null;
    this.visibleChange.emit(false);
  }
}
