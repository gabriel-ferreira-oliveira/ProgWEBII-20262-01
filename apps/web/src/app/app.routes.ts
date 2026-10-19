import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { mediaKindGuard } from './core/media/media-kind.guard';
import { MediaKindRegistry } from './core/media/media-kind.registry';

/**
 * Rotas do CeViu (paridade com o CardLayout/Janelas do legado):
 * login/cadastro publicos; home/catalogo/perfis/pesquisa autenticados
 * dentro do shell (sidebar persistente — decisao aprovada na Fase 4).
 * O catalogo usa a rota generica `/media/:kind` (uma tela para todos os
 * tipos do registry); os titulos reproduzem os titulos das janelas Swing.
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
        path: 'media/:kind',
        title: (rota) => {
          const registry = inject(MediaKindRegistry);
          const entrada = registry.porKey(rota.paramMap.get('kind') ?? '');
          return entrada?.metadados.pageTitle ?? 'Filmes e series';
        },
        canActivate: [mediaKindGuard],
        loadComponent: () =>
          import('./features/media/media-list.component').then((m) => m.MediaListComponent),
      },
      // Rotas antigas (links/bookmarks do legado) caem no catalogo generico.
      { path: 'movies', redirectTo: '/media/movies' },
      { path: 'series', redirectTo: '/media/series' },
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
