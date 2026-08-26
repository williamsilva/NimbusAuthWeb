// Domínios confirmados em 2026-08-26: nimbussystems.com.br (RAIZ, sem subdomínio) é o
// NimbusAuthWeb (este frontend); auth.nimbussystems.com.br é o backend/Authorization Server
// (NimbusAuthServer, já em produção) - precisam bater com NIMBUSAUTH_WEB_REDIRECT_URI/
// _POST_LOGOUT_REDIRECT_URI/_ALLOWED_ORIGIN no Railway do NimbusAuth (ver application-prod.yml
// e .env.railway.example).
export const environment = {
  production: true,
  apiBaseUrl: 'https://auth.nimbussystems.com.br',
  auth: {
    issuer: 'https://auth.nimbussystems.com.br',
    clientId: 'nimbusauth-web',
    redirectUri: 'https://nimbussystems.com.br/auth-callback',
    postLogoutRedirectUri: 'https://nimbussystems.com.br',
    scope: 'openid profile',
  },
};
