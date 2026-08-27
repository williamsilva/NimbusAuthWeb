import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { PanelModule } from 'primeng/panel';
import { Popover, PopoverModule } from 'primeng/popover';
import { Tooltip } from 'primeng/tooltip';

export interface ActiveFilterItem {
  label: string;
  value: string;
}

export interface ActiveFilterGroup {
  title: string;
  filters: ActiveFilterItem[];
}

/** Painel colapsável de filtros avançados, portado do cs-filters-panel do CardSyncWeb. É puramente
 *  "casca visual + botões de ação" (Buscar/Limpar) - os campos de filtro em si são declarados pela
 *  tela que usa este componente, via <ng-content>, e seus valores vivem em signals da própria
 *  tela (nunca passam por um @Input daqui). */
@Component({
  standalone: true,
  selector: 'app-filters-panel',
  styleUrl: './filters-panel.component.scss',
  templateUrl: './filters-panel.component.html',
  imports: [PanelModule, Tooltip, ButtonModule, PopoverModule, ChipModule],
})
export class FiltersPanelComponent {
  @Input() title = 'Filtrar';
  @Input() activeCount = 0;
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  @Input() activeFilters: ActiveFilterItem[] = [];
  @Input() activeFilterGroups: ActiveFilterGroup[] = [];
  @Input() actionsAlign: 'start' | 'center' | 'end' = 'end';

  @Output() clear = new EventEmitter<void>();
  @Output() search = new EventEmitter<void>();

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  onInfoEnter(op: Popover, event: Event): void {
    this.cancelHide();
    op.show(event);
  }

  onInfoLeave(op: Popover): void {
    // pequeno delay pra permitir mover o mouse até o popover
    this.hideTimer = setTimeout(() => op.hide(), 150);
  }

  onPopoverEnter(): void {
    this.cancelHide();
  }

  onPopoverLeave(op: Popover): void {
    op.hide();
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  private cancelHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
