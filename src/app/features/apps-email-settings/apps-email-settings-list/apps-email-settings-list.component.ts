import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';

import { buildListQuery } from '../../../core/list-base/list-query.builder';
import { readSingleFilterValue } from '../../../core/list-base/table-filter-readers';
import { StatefulListPage } from '../../../core/list-base/stateful-list-page';
import { STATE_KEY } from '../../../core/state-key.constants';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ActiveFilterItem, FiltersPanelComponent } from '../../../shared/filters-panel/filters-panel.component';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { AppsApiService } from '../../apps/apps.api.service';
import { AppModel, AppsAdvancedFilters, AppsFiltersState } from '../../apps/apps.models';
import { AppsEmailSettingsDialogComponent } from '../apps-email-settings-dialog/apps-email-settings-dialog.component';

/** Painel central de Config de E-mail de TODOS os apps do ecossistema (nimbuscore + cardsync/
 *  nimbusflow/nimbusdesk/nimbusnovax) - mesmo padrão de lista avançada das outras telas
 *  (StatefulListPage + cs-filters-panel + p-columnFilter, ver core/list-base), reaproveitando o
 *  MESMO endpoint `/v1/apps/search` da tela Apps (não existe endpoint de lista próprio - só o de
 *  get/put de config de e-mail de 1 app por vez). Selecionar o próprio NimbusCore (appKey
 *  "nimbuscore") no `edit()` abre o MESMO dialog, que troca de API client-side (ver
 *  AppsEmailSettingsDialogComponent) - nenhum filtro de exclusão aqui, diferente de antes da
 *  fusão das 2 telas (Config de E-mail própria + E-mail dos Apps) numa só. */
@Component({
  standalone: true,
  selector: 'app-apps-email-settings-list',
  templateUrl: './apps-email-settings-list.component.html',
  imports: [
    ButtonModule,
    FiltersPanelComponent,
    FloatLabel,
    FormsModule,
    InputTextModule,
    PageHeaderComponent,
    TableModule,
    TooltipModule,
    TranslateModule,
    AppsEmailSettingsDialogComponent,
  ],
})
export class AppsEmailSettingsListComponent extends StatefulListPage<AppsFiltersState, AppsAdvancedFilters> implements OnInit {
  @ViewChild('dt') private dt?: Table;

  private readonly api = inject(AppsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  override rows = Number(localStorage.getItem(this.tableRowsKey())) || StatefulListPage.DEFAULT_ROWS;

  readonly apps = signal<AppModel[]>([]);
  readonly totalRecords = signal(0);
  readonly loading = signal(false);
  readonly loadedOnce = signal(false);

  readonly name = signal('');
  readonly appKey = signal('');

  readonly dialogVisible = signal(false);
  readonly editingApp = signal<AppModel | null>(null);

  private handledQueryParam = false;

  protected readonly advancedActiveFilters = computed<ActiveFilterItem[]>(() => {
    const items: ActiveFilterItem[] = [];

    const name = this.name().trim();
    const appKey = this.appKey().trim();

    if (name) items.push({ label: this.i18n.tUi('appsEmailSettings.list.fields.name', 'Nome'), value: name });
    if (appKey) items.push({ label: this.i18n.tUi('appsEmailSettings.list.fields.appKey', 'appKey'), value: appKey });

    return items;
  });

  ngOnInit(): void {
    this.initStatefulList();
  }

  clear(): void {
    this.clearTableAndReload(this.dt);
  }

  /** Veio do link "Configurações > E-mail" de outro app (?appKey=X na URL) - abre o dialog de
   *  edição direto naquele app, em vez de deixar o usuário procurar na tabela. */
  private openFromQueryParamIfPresent(): void {
    if (this.handledQueryParam) return;
    this.handledQueryParam = true;

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

  protected override tableStateKey(): string {
    return STATE_KEY.APPS_EMAIL_SETTINGS.TABLE.STATE.V1;
  }

  protected override tableRowsKey(): string {
    return STATE_KEY.APPS_EMAIL_SETTINGS.TABLE.ROWS.V1;
  }

  protected override filtersKey(): string {
    return STATE_KEY.APPS_EMAIL_SETTINGS.FILTERS.V1;
  }

  override refresh(): void {
    this.reloadWithCurrentState();
  }

  protected override loadFirstPage(): void {
    const tableQuery = { page: 0, size: this.rows, sort: [], tableFilters: {}, globalFilter: null };
    const query = buildListQuery<AppsAdvancedFilters>(tableQuery, this.buildAdvancedFilters());
    this.loadPageInternal(query);
  }

  protected override resetFilters(): void {
    this.name.set('');
    this.appKey.set('');
  }

  protected override toFiltersState(): AppsFiltersState {
    return {
      name: this.name(),
      appKey: this.appKey(),
      active: null,
      createdBy: null,
      createdAtRange: null,
    };
  }

  protected override applyFiltersState(state: AppsFiltersState): void {
    this.name.set(state.name ?? '');
    this.appKey.set(state.appKey ?? '');
  }

  protected override buildAdvancedFilters(): Partial<AppsAdvancedFilters> {
    return {
      name: this.name().trim() || undefined,
      appKey: this.appKey().trim() || undefined,
    };
  }

  protected override mapTableFiltersToActiveItems(filters: Record<string, unknown> | null): ActiveFilterItem[] {
    const items: ActiveFilterItem[] = [];

    const name = readSingleFilterValue(filters, 'name');
    if (name) items.push({ label: this.i18n.tUi('appsEmailSettings.list.fields.name', 'Nome'), value: name });

    const appKey = readSingleFilterValue(filters, 'appKey');
    if (appKey) items.push({ label: this.i18n.tUi('appsEmailSettings.list.fields.appKey', 'appKey'), value: appKey });

    return items;
  }

  protected override loadPage(query: ReturnType<typeof buildListQuery<AppsAdvancedFilters>>): void {
    this.loadPageInternal(query);
  }

  private loadPageInternal(query: ReturnType<typeof buildListQuery<AppsAdvancedFilters>>): void {
    this.loading.set(true);
    this.api
      .searchAdvanced(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.apps.set(result._embedded?.content ?? []);
          this.totalRecords.set(result.page.totalElements);
          this.loading.set(false);
          this.loadedOnce.set(true);
          this.openFromQueryParamIfPresent();
        },
        error: () => {
          this.loading.set(false);
          this.loadedOnce.set(true);
        },
      });
  }
}
