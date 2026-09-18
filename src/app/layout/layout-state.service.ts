import { Injectable, effect, signal } from '@angular/core';

/** Estado de layout (sidebar visível/oculta) compartilhado entre Topbar/Sidebar/Layout - mesmo
 *  padrão dos outros apps (CardSyncWeb/etc.), só com a chave de storage própria. */
@Injectable({ providedIn: 'root' })
export class LayoutStateService {
  private static readonly STORAGE_KEY = 'nimbuscore.layout.sidebarVisible';

  readonly sidebarVisible = signal(true);

  constructor() {
    if (!this.isBrowser()) return;

    const saved = window.localStorage.getItem(LayoutStateService.STORAGE_KEY);
    if (saved === 'true' || saved === 'false') {
      this.sidebarVisible.set(saved === 'true');
    }

    effect(() => {
      window.localStorage.setItem(LayoutStateService.STORAGE_KEY, String(this.sidebarVisible()));
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
}
