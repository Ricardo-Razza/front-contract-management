import { Routes } from '@angular/router';
import { LayoutComponent } from '@features/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'secretarias',
        loadComponent: () => import('./features/secretarias/secretarias.component').then(m => m.SecretariasComponent)
      },
      {
        path: 'servidores',
        loadComponent: () => import('./features/servidores/servidores.component').then(m => m.ServidoresComponent)
      },
      {
        path: 'atas',
        loadComponent: () => import('./features/atas/atas.component').then(m => m.AtasComponent)
      },
      {
        path: 'equipes',
        loadComponent: () => import('./features/equipes/equipes.component').then(m => m.EquipesComponent)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];