import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { AuthCallbackComponent } from './core/auth/auth-callback.component';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  { path: 'auth-callback', component: AuthCallbackComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'apps' },
      {
        path: 'apps',
        loadComponent: () =>
          import('./features/apps/apps-list/apps-list.component').then((m) => m.AppsListComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users-list/users-list.component').then((m) => m.UsersListComponent),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/groups/groups-list/groups-list.component').then((m) => m.GroupsListComponent),
      },
      {
        path: 'security-settings',
        loadComponent: () =>
          import('./features/security-settings/security-settings-page.component').then(
            (m) => m.SecuritySettingsPageComponent,
          ),
      },
      {
        path: 'apps-email-settings',
        loadComponent: () =>
          import('./features/apps-email-settings/apps-email-settings-list/apps-email-settings-list.component').then(
            (m) => m.AppsEmailSettingsListComponent,
          ),
      },
      {
        path: 'apps-email-log',
        loadComponent: () =>
          import('./features/apps-email-log/apps-email-log-list/apps-email-log-list.component').then(
            (m) => m.AppsEmailLogListComponent,
          ),
      },
      {
        path: 'backup',
        loadComponent: () =>
          import('./features/backup/backup-page.component').then((m) => m.BackupPageComponent),
      },
      // Destinos hardcoded pelo TopbarComponent compartilhado (@williamsilva/nimbus-web-commons)
      // no menu de conta ("Meu perfil"/"Trocar senha") - mesmos paths usados pelos outros 4 apps.
      {
        path: 'security/account/profile',
        loadComponent: () =>
          import('./features/account/profile/profile.component').then((m) => m.ProfilePageComponent),
      },
      {
        path: 'security/account/password',
        loadComponent: () =>
          import('./features/account/account-password/account-password.component').then(
            (m) => m.AccountPasswordComponent,
          ),
      },
      { path: '**', redirectTo: 'apps' },
    ],
  },
];
