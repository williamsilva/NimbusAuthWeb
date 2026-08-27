import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { generateCodeChallenge, generateRandomString } from './pkce.util';

interface TokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

interface StoredToken {
  accessToken: string;
  idToken: string | null;
  expiresAt: number;
}

const STORAGE_KEY = 'nimbusauth_web_token';
const VERIFIER_KEY = 'nimbusauth_web_pkce_verifier';
const STATE_KEY = 'nimbusauth_web_oauth_state';
const RETURN_TO_KEY = 'nimbusauth_web_return_to';

/**
 * Authorization Code + PKCE direto contra o NimbusAuth (client público "nimbusauth-web", sem
 * client-secret e sem grant de refresh_token - ver RegisteredClientBootstrap/AuthServerProperties.
 * Access token de vida curta (10min, mesmo TTL dos outros clients) guardado em sessionStorage;
 * quando expira, ensureAuthenticated() manda o usuário de volta pro /oauth2/authorize - como a
 * sessão de login do NimbusAuth (cookie, ver SecurityConfig#webChain) costuma continuar válida,
 * isso normalmente é transparente (sem pedir senha de novo), sem precisar de silent-renew via
 * iframe (mais simples e sem os problemas de cookie de terceiros de invisible iframe).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<StoredToken | null>(this.readStoredToken());

  readonly isAuthenticated = computed(() => {
    const token = this.tokenState();
    return !!token && token.expiresAt > Date.now();
  });

  /** Timestamp (ms) de expiração do access token atual, ou null se não autenticado - usado pelo
   *  SessionService pro contador de tempo de sessão no header. */
  readonly expiresAt = computed(() => this.tokenState()?.expiresAt ?? null);

  /** Username (claim "username", ver JwtClaimsCustomizer) do usuário logado, lido direto do
   *  payload do access token - decode client-side só pra UI (ex.: bloquear auto-desativação na
   *  tela de Usuários), NUNCA usado como fonte de verdade de segurança (o backend valida tudo de
   *  novo via CheckSecurity). */
  readonly currentUsername = computed(() => this.decodeUsername(this.tokenState()?.accessToken ?? null));

  constructor(private readonly http: HttpClient) {}

  get accessToken(): string | null {
    const token = this.tokenState();
    if (!token || token.expiresAt <= Date.now()) {
      return null;
    }
    return token.accessToken;
  }

  /** Redireciona (navegação de página inteira, não XHR) pro /oauth2/authorize do NimbusAuth. */
  async startLogin(returnTo: string): Promise<void> {
    const verifier = generateRandomString();
    const state = generateRandomString(32);
    const challenge = await generateCodeChallenge(verifier);

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(RETURN_TO_KEY, returnTo || '/');

    const url = new URL('/oauth2/authorize', environment.auth.issuer);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', environment.auth.clientId);
    url.searchParams.set('scope', environment.auth.scope);
    url.searchParams.set('redirect_uri', environment.auth.redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    window.location.assign(url.toString());
  }

  /** Chamado pela rota /auth-callback - troca o code pelo token e devolve a rota pra onde voltar. */
  async handleCallback(code: string, state: string): Promise<string> {
    const expectedState = sessionStorage.getItem(STATE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);

    if (!verifier || !expectedState || expectedState !== state) {
      throw new Error('Estado OAuth2 inválido ou expirado - tente entrar novamente.');
    }

    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('code', code)
      .set('redirect_uri', environment.auth.redirectUri)
      .set('client_id', environment.auth.clientId)
      .set('code_verifier', verifier);

    const response = await firstValueFrom(
      this.http.post<TokenResponse>(new URL('/oauth2/token', environment.auth.issuer).toString(), body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    this.storeToken(response);

    const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || '/';
    sessionStorage.removeItem(RETURN_TO_KEY);
    return returnTo;
  }

  /** RP-Initiated Logout (OIDC) - encerra a sessão/SSO do NimbusAuth, não só o token local. */
  logout(): void {
    const token = this.tokenState();
    this.clearToken();

    const url = new URL('/connect/logout', environment.auth.issuer);
    if (token?.idToken) {
      url.searchParams.set('id_token_hint', token.idToken);
    }
    url.searchParams.set('post_logout_redirect_uri', environment.auth.postLogoutRedirectUri);
    window.location.assign(url.toString());
  }

  private storeToken(response: TokenResponse): void {
    const stored: StoredToken = {
      accessToken: response.access_token,
      idToken: response.id_token ?? null,
      // -5s de margem de segurança contra relógio/latência de rede.
      expiresAt: Date.now() + Math.max(0, response.expires_in - 5) * 1000,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    this.tokenState.set(stored);
  }

  private clearToken(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.tokenState.set(null);
  }

  private decodeUsername(accessToken: string | null): string | null {
    if (!accessToken) return null;
    try {
      const payload = accessToken.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = JSON.parse(atob(base64)) as { username?: unknown };
      return typeof json.username === 'string' ? json.username : null;
    } catch {
      return null;
    }
  }

  private readStoredToken(): StoredToken | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredToken;
    } catch {
      return null;
    }
  }
}
