import { AppMenuItem } from './menu.model';

/** Espelha as rotas de app.routes.ts. Sem `permissions` em nenhum item - o NimbusAuthWeb não tem
 *  controle de permissão client-side hoje (a proteção real é 100% server-side, via JWT/
 *  CheckSecurity de cada endpoint); manter esse comportamento aqui, não introduzir um gate novo. */
export const APP_MENU: AppMenuItem[] = [
  {
    labelKey: 'menu.apps',
    icon: 'pi pi-th-large text-blue-600',
    route: '/apps',
    exact: false,
  },
  {
    labelKey: 'menu.security.title',
    icon: 'pi pi-shield text-red-600',
    children: [
      {
        labelKey: 'menu.security.users',
        icon: 'pi pi-user text-red-400',
        route: '/users',
        exact: false,
      },
      {
        labelKey: 'menu.security.groups',
        icon: 'pi pi-id-card text-red-400',
        route: '/groups',
        exact: false,
      },
      {
        labelKey: 'menu.security.settings',
        icon: 'pi pi-cog text-red-400',
        route: '/security-settings',
        exact: false,
      },
    ],
  },
  {
    // Fundiu "Configurações de E-mail" (só NimbusAuth) + "E-mail dos Apps" (proxy satélites) numa
    // tela só (apps-email-settings-list) - a lista agora inclui "NimbusAuth" também, ver
    // AppsEmailSettingsListComponent/AppsEmailSettingsDialogComponent. Volta a ser 1 item flat
    // (sem submenu), mesmo padrão de menu.apps/menu.audit.email/menu.backup.
    labelKey: 'menu.email.settings',
    icon: 'pi pi-envelope text-indigo-600',
    route: '/apps-email-settings',
    exact: false,
  },
  {
    // Fundiu "Auditoria de E-mail" (só NimbusAuth) + "Auditoria dos Apps" (proxy satélites) numa
    // tela só (apps-email-log-list) - o seletor de app dela agora inclui "NimbusAuth" também, ver
    // AppsEmailLogListComponent. Volta a ser 1 item flat (sem submenu), mesmo padrão de
    // menu.apps/menu.backup.
    labelKey: 'menu.audit.email',
    icon: 'pi pi-history text-sky-600',
    route: '/apps-email-log',
    exact: false,
  },
  {
    labelKey: 'menu.backup',
    icon: 'pi pi-database text-indigo-600',
    route: '/backup',
    exact: false,
  },
];
