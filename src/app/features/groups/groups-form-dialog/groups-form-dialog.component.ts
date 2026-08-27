import { Component, DestroyRef, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

import { GroupsApiService } from '../groups.api.service';
import { GroupModel } from '../groups.models';

/** Cria/edita nome+descrição de um grupo. Permissões e usuários são geridos à parte (ver
 *  group-manage-dialog) - o appKey nunca vai no body, o backend resolve pelo client autenticado
 *  (sempre 'nimbusauth' aqui). */
@Component({
  standalone: true,
  selector: 'app-groups-form-dialog',
  templateUrl: './groups-form-dialog.component.html',
  imports: [ButtonModule, DialogModule, InputTextModule, ReactiveFormsModule, TextareaModule],
})
export class GroupsFormDialogComponent {
  visible = input.required<boolean>();
  group = input<GroupModel | null>(null);

  @Output() saved = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly api = inject(GroupsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEditMode = computed(() => !!this.group());
  readonly saving = signal(false);
  readonly submitted = signal(false);

  private lastLoadedId: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1204)]],
  });

  constructor() {
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

    const req$ = group ? this.api.update(group.id, v) : this.api.create(v);
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
    this.form.reset({ name: '', description: '' });
  }
}
