import { Injectable, effect, signal } from '@angular/core';
import { NimbusLayoutMode } from '@williamsilva/nimbus-web-commons';

/** Estado de layout (sidebar visível/oculta + modo de layout) compartilhado entre Topbar/Sidebar/
 *  Layout - mesmo padrão dos outros apps (CardSyncWeb/etc.), só com a chave de storage própria. */
@Injectable({ providedIn: 'root' })
export class LayoutStateService {
  private static readonly STORAGE_KEY = 'nimbuscore.layout.sidebarVisible';
  private static readonly MODE_STORAGE_KEY = 'nimbuscore.layout.mode';

  readonly sidebarVisible = signal(true);
  readonly layoutMode = signal<NimbusLayoutMode>('static');

  constructor() {
    if (!this.isBrowser()) return;

    const saved = window.localStorage.getItem(LayoutStateService.STORAGE_KEY);
    if (saved === 'true' || saved === 'false') {
      this.sidebarVisible.set(saved === 'true');
    }

    const savedMode = window.localStorage.getItem(LayoutStateService.MODE_STORAGE_KEY);
    if (savedMode === 'static' || savedMode === 'slim' || savedMode === 'horizontal' || savedMode === 'drawer') {
      this.layoutMode.set(savedMode);
    }

    effect(() => {
      window.localStorage.setItem(LayoutStateService.STORAGE_KEY, String(this.sidebarVisible()));
    });

    effect(() => {
      window.localStorage.setItem(LayoutStateService.MODE_STORAGE_KEY, this.layoutMode());
    });
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  toggleSidebar(): void {
    this.sidebarVisible.update((v) => !v);
  }

  showSidebar(): void {
    this.sidebarVisible.set(true);
  }

  hideSidebar(): void {
    this.sidebarVisible.set(false);
  }

  setLayoutMode(mode: NimbusLayoutMode): void {
    this.layoutMode.set(mode);
  }
}
