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
        path: 'security-settings',
        loadComponent: () =>
          import('./features/security-settings/security-settings-page.component').then(
            (m) => m.SecuritySettingsPageComponent,
          ),
      },
      { path: '**', redirectTo: 'apps' },
    ],
  },
];
