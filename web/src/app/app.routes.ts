import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', redirectTo: 'links', pathMatch: 'full' },
      {
        path: 'links',
        loadComponent: () =>
          import('./features/quick-links/quick-links-dashboard/quick-links-dashboard.component')
            .then(m => m.QuickLinksDashboardComponent)
      },
      {
        path: 'hub',
        loadComponent: () =>
          import('./features/hub/hub.component').then(m => m.HubComponent)
      },
      {
        path: 'notes',
        loadComponent: () =>
          import('./features/notes/notes.component').then(m => m.NotesComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  }
];
