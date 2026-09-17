import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../core/auth/auth.service';
import { SessionService } from '../../core/auth/session.service';

/** Mesmo padrão visual de CardSyncWeb/NimbusFlowWeb (shared/session-expiry-modal), adaptado pro
 *  client público "nimbusauth-web" (sem grant de refresh_token, ver AuthService): não existe
 *  renovação silenciosa via XHR aqui - "Renovar sessão" e "Fazer login novamente" são a MESMA
 *  ação (startLogin(), redirect de página inteira pro /oauth2/authorize), já que a sessão de
 *  login do NimbusAuth (cookie) normalmente ainda está válida e o redirect completa sem pedir
 *  senha de novo. */
@Component({
  standalone: true,
  selector: 'app-session-expiry-modal',
  templateUrl: './session-expiry-modal.component.html',
  styleUrl: './session-expiry-modal.component.scss',
  imports: [DialogModule, ButtonModule, TranslateModule],
})
export class SessionExpiryModalComponent {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly session = inject(SessionService);

  visible = false;
  renewing = signal(false);

  private dismissUntilMs = 0;
  private lastInteractionAtMs = Date.now();
  private expiredAutoCloseId: number | null = null;

  private readonly dismissCooldownMs = 20_000;
  private readonly autoCloseAfterMs = 60_000;

  readonly expired = computed(() => this.session.isExpired());

  readonly state = computed<'normal' | 'warning' | 'danger' | 'expired'>(() => {
    if (this.expired()) return 'expired';

    const s = this.session.remainingSeconds();
    if (s == null) return 'normal';
    if (s <= 120) return 'danger';
    if (s <= 300) return 'warning';

    return 'normal';
  });

  readonly timeBlink = computed(() => {
    const state = this.state();
    return state === 'warning' || state === 'danger';
  });

  readonly mmss = computed(() => {
    const s = this.session.remainingSeconds();
    if (s == null) return '--:--';

    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, '0');
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, '0');

    return `${mm}:${ss}`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearAutoClose());

    effect(() => {
      const remaining = this.session.remainingSeconds();
      const expiring = this.session.isExpiringSoon();
      const expired = this.session.isExpired();
      const now = Date.now();

      if (remaining == null || (!expiring && !expired)) {
        this.visible = false;
        this.dismissUntilMs = 0;
        this.clearAutoClose();
        return;
      }

      if (!expired) {
        this.clearAutoClose();
      }

      // respeita "Agora não" enquanto ainda estiver na mesma janela de risco
      if (!expired && now < this.dismissUntilMs) {
        return;
      }

      if ((expiring || expired) && !this.visible) {
        this.visible = true;
        this.lastInteractionAtMs = now;
      }

      if (expired && this.visible) {
        this.scheduleAutoClose();
      }
    });
  }

  dismiss(): void {
    this.visible = false;
    this.lastInteractionAtMs = Date.now();
    this.dismissUntilMs = Date.now() + this.dismissCooldownMs;
    this.clearAutoClose();
  }

  async renew(): Promise<void> {
    this.renewing.set(true);
    try {
      await this.auth.startLogin(window.location.pathname + window.location.search);
    } catch {
      this.renewing.set(false);
    }
  }

  touchInteraction(): void {
    this.lastInteractionAtMs = Date.now();

    if (this.session.isExpired() && this.visible) {
      this.scheduleAutoClose();
    }
  }

  private scheduleAutoClose(): void {
    this.clearAutoClose();

    const elapsed = Date.now() - this.lastInteractionAtMs;
    const remaining = Math.max(0, this.autoCloseAfterMs - elapsed);

    this.expiredAutoCloseId = window.setTimeout(() => {
      this.expiredAutoCloseId = null;

      const stillExpired = this.session.isExpired();
      const idleMs = Date.now() - this.lastInteractionAtMs;

      if (!stillExpired) {
        this.visible = false;
        this.clearAutoClose();
        return;
      }

      if (idleMs >= this.autoCloseAfterMs) {
        this.visible = false;
        return;
      }

      if (this.visible) {
        this.scheduleAutoClose();
      }
    }, remaining);
  }

  private clearAutoClose(): void {
    if (this.expiredAutoCloseId != null) {
      window.clearTimeout(this.expiredAutoCloseId);
      this.expiredAutoCloseId = null;
    }
  }
}
