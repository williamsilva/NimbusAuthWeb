import { RouterLink } from '@angular/router';

import { Component, Input } from '@angular/core';

export interface PageBreadcrumbItem {
  label: string;
  url?: string;
}

/** Cabeçalho padrão de página (título/subtítulo/breadcrumb + ações via ng-content) - mesmo
 *  componente usado em CardSyncWeb/NimbusFlowWeb/NimbusDeskWeb/NimbusNovaxWeb
 *  (shared/features/page-header), portado aqui pra padronizar visualmente as telas do
 *  NimbusCoreWeb que ainda usavam um <h2> solto. */
@Component({
  standalone: true,
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
  imports: [RouterLink],
})
export class PageHeaderComponent {
  @Input() icon?: string;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumb: PageBreadcrumbItem[] = [];
  @Input() compact = false;

  hasBreadcrumb() {
    return !!this.breadcrumb?.length;
  }
}
