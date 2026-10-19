import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router, UrlTree, convertToParamMap, provideRouter } from '@angular/router';
import { mediaKindGuard } from './media-kind.guard';

function rotaDe(rota: Partial<ActivatedRouteSnapshot>): ActivatedRouteSnapshot {
  return rota as ActivatedRouteSnapshot;
}

const estadoFake = {} as RouterStateSnapshot;

describe('mediaKindGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('libera um tipo registrado', () => {
    const resultado = TestBed.runInInjectionContext(() =>
      mediaKindGuard(rotaDe({ paramMap: convertToParamMap({ kind: 'movies' }) }), estadoFake),
    );

    expect(resultado).toBe(true);
  });

  it('tipo desconhecido volta para a home', () => {
    const resultado = TestBed.runInInjectionContext(() =>
      mediaKindGuard(rotaDe({ paramMap: convertToParamMap({ kind: 'novela' }) }), estadoFake),
    );

    expect(resultado).toBeInstanceOf(UrlTree);
    expect(String(resultado)).toBe(String(TestBed.inject(Router).parseUrl('/home')));
  });
});
