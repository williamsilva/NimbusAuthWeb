import { Component, DestroyRef, EventEmitter, Output, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { TabsModule } from 'primeng/tabs';
import { MessageService } from 'primeng/api';

import { GroupsApiService } from '../groups.api.service';
import { GroupModel, PermissionOption, UserOption } from '../groups.models';

/** Gerencia permissões e usuários de um grupo - 2 abas, cada uma com seu próprio multiselect
 *  (chip) e botão salvar, espelhando os 2 endpoints independentes do backend (PUT .../permissions
 *  e PUT .../users), ambos de substituição total (não incremental). Mais simples que a tela de
 *  detalhe do CardSyncWeb (sem cards de remoção individual) - o multiselect já permite deselecionar
 *  item a item antes de salvar. */
@Component({
  standalone: true,
  selector: 'app-group-manage-dialog',
  templateUrl: './group-manage-dialog.component.html',
  imports: [ButtonModule, DialogModule, FormsModule, MultiSelectModule, TabsModule],
})
export class GroupManageDialogComponent {
  visible = input.required<boolean>();
  group = input<GroupModel | null>(null);

  @Output() saved = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  private readonly api = inject(GroupsApiService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly savingPermissions = signal(false);
  readonly savingUsers = signal(false);

  readonly permissionOptions = signal<PermissionOption[]>([]);
  readonly userOptions = signal<UserOption[]>([]);

  readonly selectedPermissionIds = signal<string[]>([]);
  readonly selectedUserIds = signal<string[]>([]);

  private lastLoadedId: string | null = null;

  constructor() {
    this.api.permissionOptions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((opts) => this.permissionOptions.set(opts));
    this.api.userOptions().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((opts) => this.userOptions.set(opts));

    effect(() => {
      if (!this.visible()) {
        return;
      }

      const group = this.group();
      if (!group || this.lastLoadedId === group.id) {
        return;
      }

      this.lastLoadedId = group.id;
      this.selectedPermissionIds.set((group.permissions ?? []).map((p) => p.id));
      this.selectedUserIds.set((group.users ?? []).map((u) => u.id));
    });
  }

  close(): void {
    this.lastLoadedId = null;
    this.visibleChange.emit(false);
  }

  savePermissions(): void {
    const group = this.group();
    if (!group) {
      return;
    }

    this.savingPermissions.set(true);
    this.api.updatePermissions(group.id, this.selectedPermissionIds()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingPermissions.set(false);
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Permissões do grupo atualizadas.' });
        this.saved.emit();
      },
      error: () => this.savingPermissions.set(false),
    });
  }

  saveUsers(): void {
    const group = this.group();
    if (!group) {
      return;
    }

    this.savingUsers.set(true);
    this.api.updateUsers(group.id, this.selectedUserIds()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.savingUsers.set(false);
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: 'Usuários do grupo atualizados.' });
        this.saved.emit();
      },
      error: () => this.savingUsers.set(false),
    });
  }
}
