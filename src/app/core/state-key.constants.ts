/** Chaves de localStorage usadas pelas telas que estendem StatefulListPage. Padrão
 *  `nimbusauth.<tela>.<tipo>.v1` - o sufixo ".v1" existe pra permitir invalidar manualmente (só
 *  trocar pra ".v2") se o shape do estado persistido mudar no futuro. */
export const STATE_KEY = {
  USERS: {
    FILTERS: { V1: 'nimbusauth.users.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbusauth.users.table.state.v1' },
      ROWS: { V1: 'nimbusauth.users.table.rows.v1' },
    },
  },
  GROUPS: {
    FILTERS: { V1: 'nimbusauth.groups.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbusauth.groups.table.state.v1' },
      ROWS: { V1: 'nimbusauth.groups.table.rows.v1' },
    },
  },
  EMAIL_LOG: {
    FILTERS: { V1: 'nimbusauth.email-log.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbusauth.email-log.table.state.v1' },
      ROWS: { V1: 'nimbusauth.email-log.table.rows.v1' },
    },
  },
  APPS: {
    FILTERS: { V1: 'nimbusauth.apps.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbusauth.apps.table.state.v1' },
      ROWS: { V1: 'nimbusauth.apps.table.rows.v1' },
    },
  },
  APPS_EMAIL_SETTINGS: {
    FILTERS: { V1: 'nimbusauth.apps-email-settings.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbusauth.apps-email-settings.table.state.v1' },
      ROWS: { V1: 'nimbusauth.apps-email-settings.table.rows.v1' },
    },
  },
  APPS_EMAIL_LOG: {
    TABLE: {
      STATE: { V1: 'nimbusauth.apps-email-log.table.state.v1' },
      ROWS: { V1: 'nimbusauth.apps-email-log.table.rows.v1' },
    },
  },
} as const;
