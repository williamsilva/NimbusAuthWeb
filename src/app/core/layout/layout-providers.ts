import { Provider, inject } from '@angular/core';
import {
  NIMBUS_SIDEBAR_HOST,
  NIMBUS_TOPBAR_HOST,
  NimbusSidebarHost,
  NimbusTopbarHost,
} from '@williamsilva/nimbus-web-commons';

import { BRAND } from '../brand/brand';
import { MeStore } from '../auth/me.store';
import { APP_MENU } from '../menu/menu.data';
import { AuthService } from '../auth/auth.service';
import { I18nService } from '../i18n/i18n.service';
import { SessionService } from '../auth/session.service';
import { PermissionService } from '../auth/permission.service';
import { LayoutStateService } from '../../layout/layout-state.service';

/** Compõe os NIMBUS_SIDEBAR_HOST/NIMBUS_TOPBAR_HOST (SidebarComponent/TopbarComponent de
 *  @williamsilva/nimbus-web-commons) a partir dos serviços já existentes deste app - mesmo padrão
 *  de CardSyncWeb/core/layout/layout-providers.ts. */
export function provideNimbusLayoutHosts(): Provider[] {
  return [
    {
      provide: NIMBUS_SIDEBAR_HOST,
      useFactory: (): NimbusSidebarHost => {
        const meStore = inject(MeStore);
        const auth = inject(AuthService);
        const perms = inject(PermissionService);
        const layout = inject(LayoutStateService);

        return {
          me: meStore.me,
          menu: APP_MENU,
          brandMarkUrl: BRAND.markUrl,
          layoutMode: layout.layoutMode,
          canAccess: (required, requireAll) => perms.canAccess(required, requireAll),
          setLayoutMode: (mode) => layout.setLayoutMode(mode),
          toggleSidebar: () => layout.toggleSidebar(),
          logout: () => auth.logout(),
        };
      },
    },
    {
      provide: NIMBUS_TOPBAR_HOST,
      useFactory: (): NimbusTopbarHost => {
        const meStore = inject(MeStore);
        const auth = inject(AuthService);
        const perms = inject(PermissionService);
        const i18n = inject(I18nService);
        const session = inject(SessionService);
        const layout = inject(LayoutStateService);

        return {
          me: meStore.me,
          menu: APP_MENU,
          brandMarkUrl: BRAND.markUrl,
          i18n,
          sidebarVisible: layout.sidebarVisible,
          remainingSeconds: session.remainingSeconds,
          layoutMode: layout.layoutMode,
          canAccess: (required, requireAll) => perms.canAccess(required, requireAll),
          isSessionExpired: () => session.isExpired(),
          toggleSidebar: () => layout.toggleSidebar(),
          setLayoutMode: (mode) => layout.setLayoutMode(mode),
          startLogin: () => auth.startLogin(window.location.pathname + window.location.search),
          logout: () => auth.logout(),
        };
      },
    },
  ];
}
