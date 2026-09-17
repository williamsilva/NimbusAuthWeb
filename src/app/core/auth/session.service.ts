import { Injectable, computed, inject, signal } from '@angular/core';

import { AuthService } from './auth.service';

/** Contador de tempo de sessão no header - mesma ideia visual do SessionService dos outros apps
 *  (CardSync/NimbusFlow/NimbusNovax), mas sem o sync entre abas via BroadcastChannel/localStorage
 *  deles: lá o contador reflete uma sessão de SERVIDOR (cookie, compartilhada entre abas); aqui é
 *  só o TTL do access token guardado em sessionStorage (por definição já isolado por aba), então
 *  não há nada real pra sincronizar. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly auth = inject(AuthService);

  readonly remainingSeconds = signal<number | null>(null);

  readonly warnAtSeconds = signal<number>(300);

  readonly isExpired = computed(() => this.remainingSeconds() === 0);

  /** Dispara o modal de renovação (ver SessionExpiryModalComponent) quando faltar pouco tempo -
   *  mesmo limiar (5min) usado pelo estado visual "warning" do contador no topbar. */
  readonly isExpiringSoon = computed(() => {
    const s = this.remainingSeconds();
    const warn = this.warnAtSeconds();
    return s !== null && s > 0 && s <= warn;
  });

  readonly sessionState = computed<'normal' | 'warning' | 'danger'>(() => {
    const s = this.remainingSeconds();
    if (s == null) return 'normal';
    if (s <= 60) return 'danger';
    if (s <= 120) return 'warning';
    return 'normal';
  });

  readonly mmss = computed(() => {
    const s = this.remainingSeconds();
    if (s == null) return null;
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  });

  constructor() {
    this.tick();
    window.setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    const expiresAt = this.auth.expiresAt();
    if (expiresAt == null) {
      this.remainingSeconds.set(null);
      return;
    }

    const diffMs = expiresAt - Date.now();
    this.remainingSeconds.set(Math.max(0, Math.ceil(diffMs / 1000)));
  }
}
