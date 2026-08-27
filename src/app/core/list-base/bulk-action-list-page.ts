import { ConfirmationService, MessageService } from 'primeng/api';
import { Observable } from 'rxjs';

/** Composição (não herança - TypeScript não suporta herança múltipla): instanciada como subclasse
 *  anônima dentro do componente que precisa de ações em lote, delegando `clearSelection()` pro
 *  host. Mesmo padrão do CardSyncWeb (features/list-base/bulk-action-list-page.ts), sem a
 *  dependência de I18nService (strings fixas em pt-BR). */
export abstract class BulkActionListPage {
  protected abstract readonly toast: MessageService;
  protected abstract readonly confirm: ConfirmationService;
  protected abstract clearSelection(): void;

  executeAction(action$: Observable<unknown>, successDetail: string): void {
    action$.subscribe({
      next: () => {
        this.clearSelection();
        this.toast.add({ severity: 'success', summary: 'Sucesso', detail: successDetail });
      },
      error: () => this.clearSelection(),
    });
  }

  confirmAction(params: { header: string; message: string; icon: string; accept: () => void }): void {
    this.confirm.confirm(params);
  }
}
