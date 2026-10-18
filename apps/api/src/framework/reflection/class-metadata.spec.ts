import { defineOwnMetadata, getMergedMetadata, getOwnMetadata } from './class-metadata';

const KEY = 'test:registro';

describe('framework/reflection/class-metadata (T1.1)', () => {
  it('grava e lê o metadado own de uma classe', () => {
    class Filme {}
    defineOwnMetadata(Filme, KEY, { titulo: 'regra' });
    expect(getOwnMetadata(Filme, KEY)).toEqual({ titulo: 'regra' });
  });

  it('isola classes diferentes', () => {
    class Filme {}
    class Serie {}
    defineOwnMetadata(Filme, KEY, { soDoFilme: true });
    expect(getOwnMetadata(Serie, KEY)).toBeUndefined();
    expect(getMergedMetadata(Serie, KEY)).toBeUndefined();
  });

  it('getOwnMetadata não enxerga o metadado do ancestral (sem merge)', () => {
    class Base {}
    class Filha extends Base {}
    defineOwnMetadata(Base, KEY, { a: 1 });
    expect(getOwnMetadata(Filha, KEY)).toBeUndefined();
    expect(getMergedMetadata(Filha, KEY)).toEqual({ a: 1 });
  });

  it('mescla ancestral + descendente na herança', () => {
    class Base {}
    class Filha extends Base {}
    defineOwnMetadata(Base, KEY, { a: 1 });
    defineOwnMetadata(Filha, KEY, { b: 2 });
    expect(getMergedMetadata(Filha, KEY)).toEqual({ a: 1, b: 2 });
    expect(getMergedMetadata(Base, KEY)).toEqual({ a: 1 });
  });

  it('o valor do descendente sobrepõe a mesma chave do ancestral', () => {
    class Base {}
    class Filha extends Base {}
    defineOwnMetadata(Base, KEY, { nome: 'raiz', outro: 1 });
    defineOwnMetadata(Filha, KEY, { nome: 'filha' });
    expect(getMergedMetadata(Filha, KEY)).toEqual({ nome: 'filha', outro: 1 });
  });

  it('concatena arrays do ancestral para o descendente', () => {
    class Base {}
    class Filha extends Base {}
    defineOwnMetadata(Base, KEY, ['a1', 'a2']);
    defineOwnMetadata(Filha, KEY, ['b1']);
    expect(getMergedMetadata(Filha, KEY)).toEqual(['a1', 'a2', 'b1']);
  });

  it('tipos primitivos: o descendente substitui o ancestral', () => {
    class Base {}
    class Filha extends Base {}
    defineOwnMetadata(Base, KEY, 'raiz');
    defineOwnMetadata(Filha, KEY, 'filha');
    expect(getMergedMetadata(Filha, KEY)).toBe('filha');
  });

  it('mescla cadeia multinível na ordem raiz → alvo', () => {
    class A {}
    class B extends A {}
    class C extends B {}
    defineOwnMetadata(A, KEY, { a: 1 });
    defineOwnMetadata(B, KEY, { b: 2 });
    defineOwnMetadata(C, KEY, { c: 3, a: 9 });
    expect(getMergedMetadata(C, KEY)).toEqual({ a: 9, b: 2, c: 3 });
  });

  it('gravar na filha não altera o metadado do ancestral', () => {
    class Base {}
    class Filha extends Base {}
    defineOwnMetadata(Base, KEY, { a: 1 });
    defineOwnMetadata(Filha, KEY, { b: 2 });
    expect(getOwnMetadata(Base, KEY)).toEqual({ a: 1 });
    expect(getMergedMetadata(Base, KEY)).toEqual({ a: 1 });
  });

  it('irmãs não são afetadas pelo metadado uma da outra', () => {
    class Base {}
    class Irma1 extends Base {}
    class Irma2 extends Base {}
    defineOwnMetadata(Base, KEY, { a: 1 });
    defineOwnMetadata(Irma1, KEY, { b: 1 });
    expect(getMergedMetadata(Irma2, KEY)).toEqual({ a: 1 });
    expect(getOwnMetadata(Irma2, KEY)).toBeUndefined();
  });

  it('aceita construtor, protótipo e instância (normaliza para o construtor)', () => {
    class Filme {}
    defineOwnMetadata(Filme.prototype, KEY, { via: 'prototipo' });
    expect(getOwnMetadata(Filme, KEY)).toEqual({ via: 'prototipo' });
    defineOwnMetadata(new Filme(), KEY, { via: 'instancia' });
    expect(getOwnMetadata(Filme.prototype, KEY)).toEqual({ via: 'instancia' });
    expect(getMergedMetadata(new Filme(), KEY)).toEqual({ via: 'instancia' });
  });

  it('chave inexistente devolve undefined', () => {
    class Filme {}
    expect(getOwnMetadata(Filme, 'nao:existe')).toBeUndefined();
    expect(getMergedMetadata(Filme, 'nao:existe')).toBeUndefined();
  });

  it('aceita merge customizado', () => {
    class Base {}
    class Filha extends Base {}
    defineOwnMetadata(Base, KEY, ['x']);
    defineOwnMetadata(Filha, KEY, ['y']);
    const resultado = getMergedMetadata<string[]>(Filha, KEY, (ancestral, propria) =>
      [...(ancestral ?? []), ...propria].map((item) => item.toUpperCase()),
    );
    expect(resultado).toEqual(['X', 'Y']);
  });

  it('a leitura mesclada devolve contêiner próprio (não vaza a referência gravada)', () => {
    class Filme {}
    defineOwnMetadata(Filme, KEY, { a: 1 });
    const lido = getMergedMetadata<{ a: number }>(Filme, KEY);
    lido!.a = 99;
    expect(getMergedMetadata(Filme, KEY)).toEqual({ a: 1 });
  });
});
