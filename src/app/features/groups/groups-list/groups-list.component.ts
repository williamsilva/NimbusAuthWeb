import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { GroupsApiService } from '../groups.api.service';
import { GroupModel } from '../groups.models';
import { GroupsFormDialogComponent } from '../groups-form-dialog/groups-form-dialog.component';
import { GroupManageDialogComponent } from '../group-manage-dialog/group-manage-dialog.component';

/** Tela única de gestão de Grupos, restrita ao app nimbusauth (GroupsApiService#search já fixa
 *  appKey). Criar/editar só nome+descrição (dialog simples); permissões e usuários do grupo são
 *  geridos num dialog à parte (group-manage-dialog). */
@Component({
  standalone: true,
  selector: 'app-groups-list',
  templateUrl: './groups-list.component.html',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    DatePipe,
    FormsModule,
    InputTextModule,
    TableModule,
    TooltipModule,
    GroupsFormDialogComponent,
    GroupManageDialogComponent,
  ],
})
export class GroupsListComponent implements OnInit {
  private readonly api = inject(GroupsApiService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly groups = signal<GroupModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly globalFilter = signal('');

  readonly dialogVisible = signal(false);
  readonly editingGroup = signal<GroupModel | null>(null);

  readonly manageDialogVisible = signal(false);
  readonly managingGroup = signal<GroupModel | null>(null);

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

    this.api.search(this.globalFilter(), page, size).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.groups.set(result._embedded?.content ?? []);
        this.totalRecords.set(result.page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goNew(): void {
    this.editingGroup.set(null);
    this.dialogVisible.set(true);
  }

  edit(row: GroupModel): void {
    this.editingGroup.set(row);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
    if (!visible) {
      this.editingGroup.set(null);
    }
  }

  onSaved(): void {
    this.load(this.lastPage, this.lastSize);
  }

  manage(row: GroupModel): void {
    this.managingGroup.set(row);
    this.manageDialogVisible.set(true);
  }

  onManageDialogVisibleChange(visible: boolean): void {
    this.manageDialogVisible.set(visible);
    if (!visible) {
      this.managingGroup.set(null);
      this.load(this.lastPage, this.lastSize);
    }
  }

  onManageSaved(): void {
    this.load(this.lastPage, this.lastSize);
  }

  confirmDelete(row: GroupModel): void {
    this.confirm.confirm({
      header: 'Excluir grupo',
      message: `Excluir "${row.name}"? Só é possível se não houver nenhum usuário vinculado a ele.`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.delete(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Excluído', detail: `"${row.name}" foi excluído.` });
            this.load(this.lastPage, this.lastSize);
          },
        });
      },
    });
  }
}
