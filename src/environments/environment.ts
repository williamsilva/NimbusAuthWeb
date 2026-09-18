// Ambiente de dev - valores batem com o client "nimbuscore-web" (confidential: false, registrado
// em nb_apps). Porta 4200 - mesma porta nativa do "ng serve" do CardSyncWeb; não suba os dois
// frontends ao mesmo tempo.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:9090',
  auth: {
    issuer: 'http://localhost:9090',
    clientId: 'nimbuscore-web',
    redirectUri: 'http://localhost:4200/auth-callback',
    postLogoutRedirectUri: 'http://localhost:4200',
    scope: 'openid profile',
  },
};
