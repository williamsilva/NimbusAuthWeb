import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

import { AppsApiService } from '../../apps/apps.api.service';
import { GroupsApiService } from '../groups.api.service';
import { GroupInput, GroupModel } from '../groups.models';

/** Cria/edita nome+descrição+app de um grupo. Permissões e usuários são geridos à parte (ver
 *  group-manage-dialog). appKey só é editável na criação - imutável depois (mesmo padrão de
 *  appKey/clientId em Apps). Painel central: lista todos os apps cadastrados, não só nimbusauth
 *  (GroupsController#resolveAppKey só aceita esse override vindo do client nimbusauth-web). */
@Component({
  standalone: true,
  selector: 'app-groups-form-dialog',
  templateUrl: './groups-form-dialog.component.html',
  imports: [ButtonModule, DialogModule, InputTextModule, ReactiveFormsModule, SelectModule, TextareaModule],
})
export class GroupsFormDialogComponent {
  visible = input.required<boolean>();
  group = input<GroupModel | null>(null);

  @Output() saved = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(GroupsApiService);
  private readonly appsApi = inject(AppsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEditMode = computed(() => !!this.group());
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly appOptions = signal<{ appKey: string; name: string }[]>([]);

  private lastLoadedId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1204)]],
    appKey: ['', [Validators.required]],
  });

  constructor() {
    this.appsApi.search('', 0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      this.appOptions.set((result._embedded?.content ?? []).map((a) => ({ appKey: a.appKey, name: a.name })));
    });

    effect(() => {
      if (!this.visible()) {
        return;
      }

      const group = this.group();

      if (!group) {
        this.lastLoadedId = null;
        this.resetFormForCreate();
        return;
      }

      if (this.lastLoadedId === group.id) {
        return;
      }

      this.lastLoadedId = group.id;
      this.form.reset({
        name: group.name,
        description: group.description ?? '',
        appKey: group.appKey,
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
    const group = this.group();
    this.saving.set(true);

    const payload: GroupInput = group
      ? { name: v.name.trim(), description: v.description.trim() }
      : { name: v.name.trim(), description: v.description.trim(), appKey: v.appKey };

    const req$ = group ? this.api.update(group.id, payload) : this.api.create(payload);
    req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: group ? 'Grupo atualizado.' : 'Grupo criado.' });
        this.saved.emit();
        this.close();
      },
      error: () => this.saving.set(false),
    });
  }

  private resetFormForCreate(): void {
    this.form.reset({ name: '', description: '', appKey: '' });
  }
}
