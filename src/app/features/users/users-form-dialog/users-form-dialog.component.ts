import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';

import { APP_KEY } from '../../../core/api/api.config';
import { GroupsApiService } from '../../groups/groups.api.service';
import { GroupOption } from '../../groups/groups.models';
import { UsersApiService } from '../users.api.service';
import { UserInput, UserModel } from '../users.models';
import { cpfCnpjValidator } from '../cpf-cnpj.validator';

/** Cria/edita um usuário. Como nb_users é global (compartilhado entre cardsync/nimbusflow/
 *  nimbusnovax/nimbusauth) mas o multiselect de grupos só lista os do app nimbusauth
 *  (GroupsApiService#options já filtra por appKey), os grupos que o usuário tenha em OUTROS apps
 *  ficam de fora da seleção e precisam ser preservados manualmente no save - PUT substitui o Set
 *  de grupos inteiro (UserService#update), não faz merge. Mesmo cuidado do CardSyncWeb
 *  (users-create-dialog.component.ts). */
@Component({
  standalone: true,
  selector: 'app-users-form-dialog',
  templateUrl: './users-form-dialog.component.html',
  imports: [ButtonModule, DialogModule, InputTextModule, MultiSelectModule, ReactiveFormsModule],
})
export class UsersFormDialogComponent {
  visible = input.required<boolean>();
  user = input<UserModel | null>(null);

  @Output() saved = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsersApiService);
  private readonly groupsApi = inject(GroupsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEditMode = computed(() => !!this.user());
  readonly canResendInvite = computed(() => this.user()?.status === 5);

  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly sendingInvite = signal(false);
  readonly groupOptions = signal<GroupOption[]>([]);

  private lastLoadedId: string | null = null;
  private otherAppGroupIds: string[] = [];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    userName: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    document: ['', [Validators.required, cpfCnpjValidator()]],
    groupIds: this.fb.nonNullable.control<string[]>([], [Validators.required, Validators.minLength(1)]),
  });

  constructor() {
    this.groupsApi.options().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((opts) => this.groupOptions.set(opts));

    effect(() => {
      if (!this.visible()) {
        return;
      }

      const user = this.user();

      if (!user) {
        this.lastLoadedId = null;
        this.resetFormForCreate();
        return;
      }

      if (this.lastLoadedId === user.id) {
        return;
      }

      this.lastLoadedId = user.id;

      const groups = user.groups ?? [];
      const nimbusauthGroupIds = groups.filter((g) => g.appKey === APP_KEY).map((g) => g.id);
      this.otherAppGroupIds = groups.filter((g) => g.appKey !== APP_KEY).map((g) => g.id);

      this.form.reset({
        name: user.name,
        userName: user.userName,
        document: user.document,
        groupIds: nimbusauthGroupIds,
      });
      this.submitted.set(false);
    });
  }

  close(): void {
    this.submitted.set(false);
    this.saving.set(false);
    this.lastLoadedId = null;
    this.otherAppGroupIds = [];
    this.resetFormForCreate();
    this.visibleChange.emit(false);
  }

  onResendInvite(): void {
    const id = this.user()?.id;
    if (!id || !this.canResendInvite()) {
      return;
    }

    this.sendingInvite.set(true);
    this.api.resendInvite(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.sendingInvite.set(false);
        this.toast.add({ severity: 'success', summary: 'Convite reenviado', detail: 'E-mail de primeiro acesso reenviado.' });
      },
      error: () => this.sendingInvite.set(false),
    });
  }

  save(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    // Recoloca os grupos de outros apps (não editáveis neste seletor) junto com os do nimbusauth
    // selecionados - ver comentário da classe.
    const groupIds = Array.from(new Set([...v.groupIds, ...this.otherAppGroupIds]));
    const payload: UserInput = {
      name: v.name.trim(),
      userName: v.userName.trim().toLowerCase(),
      document: v.document.replace(/\D+/g, ''),
      groupIds,
    };

    const user = this.user();
    this.saving.set(true);

    const req$ = user ? this.api.update(user.id, payload) : this.api.create(payload);
    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: user ? 'Usuário atualizado.' : 'Usuário criado - convite de primeiro acesso enviado por e-mail.',
        });
        this.saved.emit();
        this.close();
      },
      error: () => this.saving.set(false),
    });
  }

  private resetFormForCreate(): void {
    this.form.reset({ name: '', userName: '', document: '', groupIds: [] });
  }
}
