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
} as const;
