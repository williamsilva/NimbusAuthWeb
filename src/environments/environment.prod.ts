// Domínios confirmados em 2026-08-26 (atualizado no rename NimbusAuth -> NimbusCore em
// 2026-09-18): nimbussystems.com.br (RAIZ, sem subdomínio) é o NimbusCoreWeb (este frontend,
// domínio raiz não muda); core.nimbussystems.com.br é o backend/Authorization Server
// (NimbusCoreServer, antigo auth.nimbussystems.com.br) - precisam bater com o client_id/redirect
// registrados em nb_apps (edite pela tela de Apps) e as env vars NIMBUS_CORE_* no Railway do
// NimbusCoreServer (ver application-prod.yml e .env.railway.example).
export const environment = {
  production: true,
  apiBaseUrl: 'https://core.nimbussystems.com.br',
  auth: {
    issuer: 'https://core.nimbussystems.com.br',
    clientId: 'nimbuscore-web',
    redirectUri: 'https://nimbussystems.com.br/auth-callback',
    postLogoutRedirectUri: 'https://nimbussystems.com.br',
    scope: 'openid profile',
  },
};
