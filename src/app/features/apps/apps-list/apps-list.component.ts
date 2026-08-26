import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AuthService } from '../../../core/auth/auth.service';
import { AppsApiService } from '../apps.api.service';
import { AppModel, AppSecretModel } from '../apps.models';
import { AppsFormDialogComponent } from '../apps-form-dialog/apps-form-dialog.component';
import { AppsSecretDialogComponent } from '../apps-secret-dialog/apps-secret-dialog.component';

/** Tela única de gestão de Apps (clients OAuth2 relying party) - lista + dialog de criar/editar +
 *  dialog de revelação de secret. Sem StatefulListPage/FiltersPanel (padrão do CardSyncWeb): app
 *  pequeno, poucos registros, não vale a complexidade extra pra este caso. */
@Component({
  standalone: true,
  selector: 'app-apps-list',
  templateUrl: './apps-list.component.html',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    FormsModule,
    InputTextModule,
    TableModule,
    TagModule,
    TooltipModule,
    AppsFormDialogComponent,
    AppsSecretDialogComponent,
  ],
})
export class AppsListComponent implements OnInit {
  private readonly api = inject(AppsApiService);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);

  readonly apps = signal<AppModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly globalFilter = signal('');

  readonly dialogVisible = signal(false);
  readonly editingApp = signal<AppModel | null>(null);
  readonly revealedSecret = signal<AppSecretModel | null>(null);

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
        this.apps.set(result._embedded?.content ?? []);
        this.totalRecords.set(result.page.totalElements);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goNew(): void {
    this.editingApp.set(null);
    this.dialogVisible.set(true);
  }

  edit(row: AppModel): void {
    this.editingApp.set(row);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);
    if (!visible) {
      this.editingApp.set(null);
    }
  }

  onSaved(): void {
    this.load(this.lastPage, this.lastSize);
  }

  onCreatedWithSecret(secret: AppSecretModel): void {
    this.revealedSecret.set(secret);
  }

  regenerateSecret(row: AppModel): void {
    this.confirm.confirm({
      header: 'Regenerar secret',
      message: `Isso invalida o client secret atual de "${row.name}" imediatamente. Os apps que ainda usam o valor antigo param de autenticar até você atualizar a env var lá. Continuar?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.api.regenerateSecret(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (result) => this.revealedSecret.set(result),
        });
      },
    });
  }

  confirmDelete(row: AppModel): void {
    this.confirm.confirm({
      header: 'Excluir App',
      message: `Excluir "${row.name}"? Isso remove o client OAuth2 imediatamente - ninguém mais consegue logar por ele.`,
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

  onSecretDialogClosed(): void {
    this.revealedSecret.set(null);
    this.load(this.lastPage, this.lastSize);
  }

  logout(): void {
    this.auth.logout();
  }
}
