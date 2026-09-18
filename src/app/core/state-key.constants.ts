/** Chaves de localStorage usadas pelas telas que estendem StatefulListPage. Padrão
 *  `nimbuscore.<tela>.<tipo>.v1` - o sufixo ".v1" existe pra permitir invalidar manualmente (só
 *  trocar pra ".v2") se o shape do estado persistido mudar no futuro. */
export const STATE_KEY = {
  USERS: {
    FILTERS: { V1: 'nimbuscore.users.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbuscore.users.table.state.v1' },
      ROWS: { V1: 'nimbuscore.users.table.rows.v1' },
    },
  },
  GROUPS: {
    FILTERS: { V1: 'nimbuscore.groups.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbuscore.groups.table.state.v1' },
      ROWS: { V1: 'nimbuscore.groups.table.rows.v1' },
    },
  },
  EMAIL_LOG: {
    FILTERS: { V1: 'nimbuscore.email-log.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbuscore.email-log.table.state.v1' },
      ROWS: { V1: 'nimbuscore.email-log.table.rows.v1' },
    },
  },
  APPS: {
    FILTERS: { V1: 'nimbuscore.apps.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbuscore.apps.table.state.v1' },
      ROWS: { V1: 'nimbuscore.apps.table.rows.v1' },
    },
  },
  APPS_EMAIL_SETTINGS: {
    FILTERS: { V1: 'nimbuscore.apps-email-settings.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbuscore.apps-email-settings.table.state.v1' },
      ROWS: { V1: 'nimbuscore.apps-email-settings.table.rows.v1' },
    },
  },
  APPS_EMAIL_LOG: {
    FILTERS: { V1: 'nimbuscore.apps-email-log.filters.v1' },
    TABLE: {
      STATE: { V1: 'nimbuscore.apps-email-log.table.state.v1' },
      ROWS: { V1: 'nimbuscore.apps-email-log.table.rows.v1' },
    },
  },
} as const;
