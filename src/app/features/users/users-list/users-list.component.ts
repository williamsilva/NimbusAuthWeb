import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { UsersApiService } from '../users.api.service';
import { UserModel } from '../users.models';
import { UsersFormDialogComponent } from '../users-form-dialog/users-form-dialog.component';

const STATUS_LABEL: Record<number, string> = {
  1: 'Ativo',
  2: 'Inativo',
  3: 'Bloqueado',
  4: 'Desabilitado',
  5: 'Pendente (1º acesso)',
};

const STATUS_SEVERITY: Record<number, 'success' | 'secondary' | 'danger' | 'warn'> = {
  1: 'success',
  2: 'secondary',
  3: 'danger',
  4: 'danger',
  5: 'warn',
};

/** Tela única de gestão de Usuários (globais - compartilhados entre cardsync/nimbusflow/
 *  nimbusnovax/nimbusauth). Lista sempre restrita a quem tem grupo do app nimbusauth
 *  (UsersApiService#search já fixa groupAppKey). Sem exclusão - não existe endpoint de delete de
 *  usuário no backend, só ativar/inativar. */
@Component({
  standalone: true,
  selector: 'app-users-list',
  templateUrl: './users-list.component.html',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    DatePipe,
    FormsModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
    UsersFormDialogComponent,
  ],
})
export class UsersListComponent implements OnInit {
  private readonly api = inject(UsersApiService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<UserModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly globalFilter = signal('');
  readonly statusFilter = signal<number | null>(null);

  readonly statusOptions = [
    { label: 'Todos os status', value: null },
    { label: 'Ativo', value: 1 },
    { label: 'Inativo', value: 2 },
    { label: 'Bloqueado', value: 3 },
    { label: 'Desabilitado', value: 4 },
    { label: 'Pendente (1º acesso)', value: 5 },
  ];

  readonly dialogVisible = signal(false);
  readonly editingUser = signal<UserModel | null>(null);

  private lastPage = 0;
  private lastSize = 20;

  ngOnInit(): void {
    this.load(0, this.lastSize);
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    const size = event.rows ?? this.lastSize;
    const page = Math.floor((event.first ?? 0) / size);
    this.load(page, size);
  }

  search(): void {
    this.load(0, this.lastSize);
  }

  private load(page: number, size: number): void {
    this.lastPage = page;
    this.lastSize = size;
    this.loading.set(true);

    const status = this.statusFilter();
    this.api.search(this.globalFilter(), page, size, status !== null ? [status] : null).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.users.set(result._embedded?.content ?? []);
        this.totalRecords.set(result.page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goNew(): void {
    this.editingUser.set(null);
    this.dialogVisible.set(true);
  }

  edit(row: UserModel): void {
    this.editingUser.set(row);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
    if (!visible) {
      this.editingUser.set(null);
    }
  }

  onSaved(): void {
    this.load(this.lastPage, this.lastSize);
  }

  canResendInvite(row: UserModel): boolean {
    return row.status === 5;
  }

  resendInvite(row: UserModel): void {
    this.api.resendInvite(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.toast.add({ severity: 'success', summary: 'Convite reenviado', detail: `E-mail reenviado para ${row.userName}.` }),
    });
  }

  toggleActive(row: UserModel): void {
    const activating = row.status !== 1;

    const doIt = (): void => {
      const req$ = activating ? this.api.activate(row.id) : this.api.deactivate(row.id);
      req$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.toast.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: activating ? `"${row.name}" foi ativado.` : `"${row.name}" foi inativado.`,
          });
          this.load(this.lastPage, this.lastSize);
        },
      });
    };

    if (activating) {
      doIt();
      return;
    }

    this.confirm.confirm({
      header: 'Inativar usuário',
      message: `Inativar "${row.name}"? A pessoa não consegue mais logar em nenhum app até ser reativada.`,
      icon: 'pi pi-exclamation-triangle',
      accept: doIt,
    });
  }

  statusLabel(status: number): string {
    return STATUS_LABEL[status] ?? '—';
  }

  statusSeverity(status: number): 'success' | 'secondary' | 'danger' | 'warn' {
    return STATUS_SEVERITY[status] ?? 'secondary';
  }

  formatDocument(document: string): string {
    const d = (document ?? '').replace(/\D+/g, '');
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return document;
  }
}
