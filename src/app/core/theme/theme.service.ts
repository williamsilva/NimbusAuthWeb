import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

/** Toggle de tema claro/escuro - mesmo mecanismo dos outros apps (classe "dark" na raiz,
 *  darkModeSelector: '.dark' configurado em app.config.ts), sem o sync entre abas via
 *  BroadcastChannel do CardSyncWeb (overkill pra este app pequeno). Se inicializa sozinho no
 *  construtor (singleton providedIn: 'root') - lido/aplicado assim que o 1º componente injeta. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'nimbusauth.theme';

  readonly mode = signal<ThemeMode>('light');

  constructor() {
    const saved = this.normalize(localStorage.getItem(this.storageKey));
    this.mode.set(saved);
    this.applyDom(saved);
  }

  toggle(): void {
    this.setMode(this.mode() === 'dark' ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    const normalized = this.normalize(mode);
    this.mode.set(normalized);
    this.applyDom(normalized);
    localStorage.setItem(this.storageKey, normalized);
  }

  private applyDom(mode: ThemeMode): void {
    // :root.dark (não :host-context) - de propósito, pra afetar toda a árvore de componentes;
    // dentro de um componente com View Encapsulation, use :host-context(.dark) pra reagir a isso.
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
  }

  private normalize(value: string | null | undefined): ThemeMode {
    return value === 'dark' ? 'dark' : 'light';
  }
}
