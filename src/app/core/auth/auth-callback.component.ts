import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Rota de destino do redirect_uri (ver environment.auth.redirectUri) - troca o "code" pelo token
 *  e volta pra rota que o usuário tentava acessar antes do login. */
@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div class="auth-callback">
      @if (errorMessage()) {
        <p class="auth-callback__error">{{ errorMessage() }}</p>
      } @else {
        <p>Entrando…</p>
      }
    </div>
  `,
  styles: [`
    .auth-callback { display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
    .auth-callback__error { color: #b91c1c; }
  `],
})
export class AuthCallbackComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly errorMessage = signal<string | null>(null);

  constructor() {
    void this.consumeCallback();
  }

  private async consumeCallback(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const error = params.get('error');
    if (error) {
      this.errorMessage.set(`Falha ao entrar: ${params.get('error_description') || error}`);
      return;
    }

    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      this.errorMessage.set('Callback de login inválido - faltam parâmetros code/state.');
      return;
    }

    try {
      const returnTo = await this.auth.handleCallback(code, state);
      await this.router.navigateByUrl(returnTo, { replaceUrl: true });
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Falha ao entrar - tente novamente.');
    }
  }
}
