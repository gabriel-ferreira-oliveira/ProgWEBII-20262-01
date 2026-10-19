import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { MediaKindRegistry } from './media-kind.registry';

/**
 * Deixa passar apenas tipos registrados no registry (`/media/:kind`);
 * tipo desconhecido volta para a tela principal (mesma regra dos guards de auth).
 */
export const mediaKindGuard: CanActivateFn = (route) => {
  const registry = inject(MediaKindRegistry);
  const kind = route.paramMap.get('kind') ?? '';
  return registry.porKey(kind) !== undefined || inject(Router).parseUrl('/home');
};
