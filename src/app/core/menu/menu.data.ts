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
    labelKey: 'menu.email.title',
    icon: 'pi pi-envelope text-indigo-600',
    children: [
      {
        labelKey: 'menu.email.settings',
        icon: 'pi pi-envelope text-indigo-400',
        route: '/email-settings',
        exact: false,
      },
      {
        labelKey: 'menu.email.appsSettings',
        icon: 'pi pi-share-alt text-indigo-400',
        route: '/apps-email-settings',
        exact: false,
      },
    ],
  },
  {
    labelKey: 'menu.audit.title',
    icon: 'pi pi-history text-sky-600',
    children: [
      {
        labelKey: 'menu.audit.email',
        icon: 'pi pi-envelope text-sky-400',
        route: '/email-log',
        exact: false,
      },
      {
        labelKey: 'menu.audit.appsEmail',
        icon: 'pi pi-share-alt text-sky-400',
        route: '/apps-email-log',
        exact: false,
      },
    ],
  },
  {
    labelKey: 'menu.backup',
    icon: 'pi pi-database text-indigo-600',
    route: '/backup',
    exact: false,
  },
];
