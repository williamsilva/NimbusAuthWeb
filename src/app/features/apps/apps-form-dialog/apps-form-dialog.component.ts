import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';

import { AppsApiService } from '../apps.api.service';
import { AppModel, AppSecretModel } from '../apps.models';

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/** Cria/edita um App. appKey e clientId só são editáveis na criação (imutáveis depois - ver
 *  AppEntity). Ao criar com sucesso, emite `createdWithSecret` com o client secret em claro
 *  (só existe nesta resposta - ver AppsController#create). */
@Component({
  standalone: true,
  selector: 'app-apps-form-dialog',
  templateUrl: './apps-form-dialog.component.html',
  imports: [ButtonModule, CheckboxModule, DialogModule, InputTextModule, ReactiveFormsModule, TextareaModule],
})
export class AppsFormDialogComponent {
  visible = input.required<boolean>();
  app = input<AppModel | null>(null);

  @Output() saved = new EventEmitter<void>();
  @Output() createdWithSecret = new EventEmitter<AppSecretModel>();
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AppsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEditMode = computed(() => !!this.app());
  readonly saving = signal(false);
  readonly submitted = signal(false);

  private lastLoadedId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    appKey: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40), Validators.pattern(/^[a-z][a-z0-9]*$/)]],
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description: [''],
    clientId: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[a-z0-9][a-z0-9-]*$/)]],
    redirectUri: ['', [Validators.required, Validators.maxLength(500)]],
    postLogoutRedirectUris: [''],
    allowedOrigin: [''],
    scopes: ['openid,profile', [Validators.required]],
    active: [true],
    accessTokenTtl: [''],
    refreshTokenTtl: [''],
  });

  constructor() {
    effect(() => {
      if (!this.visible()) {
        return;
      }

      const app = this.app();

      if (!app) {
        this.lastLoadedId = null;
        this.resetFormForCreate();
        return;
      }

      if (this.lastLoadedId === app.id) {
        return;
      }

      this.lastLoadedId = app.id;
      this.form.reset({
        appKey: app.appKey,
        name: app.name,
        description: app.description ?? '',
        clientId: app.clientId,
        redirectUri: app.redirectUri,
        postLogoutRedirectUris: (app.postLogoutRedirectUris ?? []).join(', '),
        allowedOrigin: app.allowedOrigin ?? '',
        scopes: (app.scopes ?? []).join(','),
        active: app.active,
        accessTokenTtl: app.accessTokenTtl ?? '',
        refreshTokenTtl: app.refreshTokenTtl ?? '',
      });
      this.submitted.set(false);
    });
  }

  close(): void {
    this.submitted.set(false);
    this.saving.set(false);
    this.lastLoadedId = null;
    this.resetFormForCreate();
    this.visibleChange.emit(false);
  }

  save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const app = this.app();
    this.saving.set(true);

    if (app) {
      this.api.update(app.id, {
        name: v.name.trim(),
        description: v.description.trim() || null,
        redirectUri: v.redirectUri.trim(),
        postLogoutRedirectUris: splitList(v.postLogoutRedirectUris),
        allowedOrigin: v.allowedOrigin.trim() || null,
        scopes: splitList(v.scopes),
        active: v.active,
        accessTokenTtl: v.accessTokenTtl.trim() || null,
        refreshTokenTtl: v.refreshTokenTtl.trim() || null,
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.add({ severity: 'success', summary: 'Sucesso', detail: 'App atualizado.' });
          this.saved.emit();
          this.close();
        },
        error: () => this.saving.set(false),
      });
      return;
    }

    this.api.create({
      appKey: v.appKey.trim().toLowerCase(),
      name: v.name.trim(),
      description: v.description.trim() || null,
      clientId: v.clientId.trim().toLowerCase(),
      redirectUri: v.redirectUri.trim(),
      postLogoutRedirectUris: splitList(v.postLogoutRedirectUris),
      allowedOrigin: v.allowedOrigin.trim() || null,
      scopes: splitList(v.scopes),
      accessTokenTtl: v.accessTokenTtl.trim() || null,
      refreshTokenTtl: v.refreshTokenTtl.trim() || null,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: 'App criado.' });
        this.saved.emit();
        this.createdWithSecret.emit(result);
        this.close();
      },
      error: () => this.saving.set(false),
    });
  }

  private resetFormForCreate(): void {
    this.form.reset({
      appKey: '',
      name: '',
      description: '',
      clientId: '',
      redirectUri: '',
      postLogoutRedirectUris: '',
      allowedOrigin: '',
      scopes: 'openid,profile',
      active: true,
      accessTokenTtl: '',
      refreshTokenTtl: '',
    });
  }
}
