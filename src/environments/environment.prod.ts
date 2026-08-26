// TODO: confirmar os domínios reais antes do primeiro deploy - ainda não decididos/registrados.
// Precisam bater com NIMBUS_AUTH_ISSUER, NIMBUSAUTH_WEB_REDIRECT_URI,
// NIMBUSAUTH_WEB_POST_LOGOUT_REDIRECT_URI e NIMBUSAUTH_WEB_ALLOWED_ORIGIN no Railway do NimbusAuth
// (ver application-prod.yml).
export const environment = {
  production: true,
  apiBaseUrl: 'https://api.nimbussystems.com.br',
  auth: {
    issuer: 'https://api.nimbussystems.com.br',
    clientId: 'nimbusauth-web',
    redirectUri: 'https://auth.nimbussystems.com.br/auth-callback',
    postLogoutRedirectUri: 'https://auth.nimbussystems.com.br',
    scope: 'openid profile',
  },
};
