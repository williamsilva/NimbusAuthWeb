import { environment } from '../../../environments/environment';

export const API = {
  base: `${environment.apiBaseUrl}/api`,
} as const;

/** appKey do próprio NimbusAuthWeb (client `nimbusauth-web` em nb_apps) - usuários e grupos são
 *  compartilhados entre cardsync/nimbusflow/nimbusnovax/nimbusauth (nb_users é global, nb_groups
 *  é escopado por app_key) - todo filtro/criação nas telas de Usuários/Grupos precisa restringir
 *  a este appKey, sem afetar vínculos que o mesmo usuário/grupo tenha em outros apps. */
export const APP_KEY = 'nimbusauth';
