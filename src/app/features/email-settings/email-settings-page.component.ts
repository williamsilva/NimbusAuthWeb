import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { FieldsetModule } from 'primeng/fieldset';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { EmailSettingsApiService } from './email-settings.api.service';
import { EmailSettings } from './email-settings.models';

/** Tela única (form, sem lista/dialog) - impl/remetente/Brevo/SMTP, mesmo padrão "singleton
 *  settings" de SecuritySettingsController. PUT sempre envia a configuração inteira, exceto
 *  brevoApiKey/smtpPassword: vazios significam "não mudar o segredo salvo" (ver
 *  EmailSettingsService#update no backend) - nunca reenviamos o valor mascarado de volta. */
@Component({
  standalone: true,
  selector: 'app-email-settings-page',
  templateUrl: './email-settings-page.component.html',
  styleUrl: './email-settings-page.component.scss',
  imports: [
    ButtonModule,
    CheckboxModule,
    FieldsetModule,
    InputNumberModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ReactiveFormsModule,
  ],
})
export class EmailSettingsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(EmailSettingsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly allowFakeImpl = signal(false);

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

    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.update({
      impl: v.impl,
      fromName: v.fromName.trim(),
      fromEmail: v.fromEmail.trim(),
      brevoApiKey: v.brevoApiKey.trim() || null,
      brevoBaseUrl: v.brevoBaseUrl.trim() || null,
      // brevoPort/brevoUsername: sem uso real - BrevoEmailSenderService autentica só via header
      // api-key (ver EmailSettingsService no backend), não há usuário/senha nem porta separada
      // pra uma API REST HTTPS. Sempre null.
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
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Configurações de e-mail atualizadas.' });
      },
      error: () => this.saving.set(false),
    });
  }
}
