import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { AppsApiService } from '../../apps/apps.api.service';
import { AppModel } from '../../apps/apps.models';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { AppsEmailSettingsDialogComponent } from '../apps-email-settings-dialog/apps-email-settings-dialog.component';

/** Painel central de Config de E-mail dos apps satélite (cardsync/nimbusflow/nimbusdesk/
 *  nimbusnovax) - lê a lista de apps já cadastrados (AppsApiService, mesma fonte da tela Apps) e
 *  filtra fora o próprio "nimbusauth" (que já tem sua tela dedicada em /email-settings, config
 *  diferente - convites/reset de senha, não a deste painel). Sem StatefulListPage/paginação,
 *  mesmo motivo de apps-list: poucos registros. Edição é um dialog por linha
 *  (AppsEmailSettingsDialogComponent), que fala com o NimbusAuthServer, que repassa (proxy) pro
 *  /internal/email-settings de cada app satélite. */
@Component({
  standalone: true,
  selector: 'app-apps-email-settings-list',
  templateUrl: './apps-email-settings-list.component.html',
  imports: [ButtonModule, PageHeaderComponent, TableModule, TooltipModule, TranslateModule, AppsEmailSettingsDialogComponent],
})
export class AppsEmailSettingsListComponent implements OnInit {
  private readonly api = inject(AppsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly apps = signal<AppModel[]>([]);
  readonly loading = signal(false);

  readonly dialogVisible = signal(false);
  readonly editingApp = signal<AppModel | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.search('', 0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        const content = result._embedded?.content ?? [];
        this.apps.set(content.filter((app) => app.appKey !== 'nimbusauth'));
        this.loading.set(false);
        this.openFromQueryParamIfPresent();
      },
      error: () => this.loading.set(false),
    });
  }

  /** Veio do link "Configurações > E-mail" de outro app (?appKey=X na URL) - abre o dialog de
   *  edição direto naquele app, em vez de deixar o usuário procurar na tabela. */
  private openFromQueryParamIfPresent(): void {
    const appKey = this.route.snapshot.queryParamMap.get('appKey');
    if (!appKey) return;
    const row = this.apps().find((app) => app.appKey === appKey);
    if (row) this.edit(row);
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
}
