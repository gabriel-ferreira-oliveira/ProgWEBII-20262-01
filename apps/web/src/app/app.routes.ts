import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

/**
 * Rotas do CeViu (paridade com o CardLayout/Janelas do legado):
 * login/cadastro publicos; home/filmes/series/perfis/pesquisa autenticados
 * dentro do shell (sidebar persistente — decisao aprovada na Fase 4).
 * Os titulos reproduzem os titulos das janelas Swing.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  {
    path: 'login',
    title: 'Login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Formulário de Cadastro',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'home',
        title: 'Filmes e series',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'movies',
        title: 'Filmes e series',
        loadComponent: () =>
          import('./features/movies/movies-list.component').then((m) => m.MoviesListComponent),
      },
      {
        path: 'series',
        title: 'Series',
        loadComponent: () =>
          import('./features/series/series-list.component').then((m) => m.SeriesListComponent),
      },
      {
        path: 'profiles',
        title: 'Filmes e series',
        loadComponent: () =>
          import('./features/profiles/profiles-list.component').then((m) => m.ProfilesListComponent),
      },
      {
        path: 'search',
        title: 'Catálogo - Resultados da Pesquisa',
        loadComponent: () =>
          import('./features/search/search-results.component').then((m) => m.SearchResultsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
