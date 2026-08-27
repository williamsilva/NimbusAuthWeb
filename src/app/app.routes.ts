import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { AuthCallbackComponent } from './core/auth/auth-callback.component';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { path: 'auth-callback', component: AuthCallbackComponent },
  {
    path: '',
    component: ShellComponent,
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
        path: 'email-settings',
        loadComponent: () =>
          import('./features/email-settings/email-settings-page.component').then(
            (m) => m.EmailSettingsPageComponent,
          ),
      },
      { path: '**', redirectTo: 'apps' },
    ],
  },
];
