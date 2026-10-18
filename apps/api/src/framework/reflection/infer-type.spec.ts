import { inferType } from './infer-type';
import type { FixtureSoTipo } from '../../testing/infer-type-fixture';

const Marca = (): PropertyDecorator => () => {};

class ClasseLocal {}

class DtoExemplo {
  @Marca() texto!: string;
  @Marca() numero!: number;
  @Marca() booleano!: boolean;
  @Marca() data!: Date;
  @Marca() uniao!: string | number;
  @Marca() nulo!: string | null;
  @Marca() indefinido!: number | undefined;
  @Marca() opcional?: number;
  @Marca() lista!: string[];
  @Marca() classeLocal!: ClasseLocal;
  @Marca() soTipo!: FixtureSoTipo;
  semDecorator!: string;
}

describe('framework/reflection/infer-type (T1.2)', () => {
  describe('inferType sobre design:type', () => {
    it('infere String, Number, Boolean e Date', () => {
      expect(inferType(DtoExemplo, 'texto')).toBe(String);
      expect(inferType(DtoExemplo, 'numero')).toBe(Number);
      expect(inferType(DtoExemplo, 'booleano')).toBe(Boolean);
      expect(inferType(DtoExemplo, 'data')).toBe(Date);
    });

    it('propriedade opcional (`?`) preserva o tipo inferido', () => {
      expect(inferType(DtoExemplo, 'opcional')).toBe(Number);
    });

    it('união vira Object → devolve o override', () => {
      expect(inferType(DtoExemplo, 'uniao', String)).toBe(String);
      expect(inferType(DtoExemplo, 'uniao')).toBeUndefined();
    });

    it('`string | null` vira Object → devolve o override', () => {
      expect(inferType(DtoExemplo, 'nulo', String)).toBe(String);
      expect(inferType(DtoExemplo, 'nulo')).toBeUndefined();
    });

    it('`number | undefined` explícito vira Object → devolve o override', () => {
      expect(inferType(DtoExemplo, 'indefinido', Number)).toBe(Number);
      expect(inferType(DtoExemplo, 'indefinido')).toBeUndefined();
    });

    it('array vira Array (não suportado) → devolve o override', () => {
      expect(inferType(DtoExemplo, 'lista', String)).toBe(String);
      expect(inferType(DtoExemplo, 'lista')).toBeUndefined();
    });

    it('classe local não é tipo inferido → devolve o override', () => {
      expect(inferType(DtoExemplo, 'classeLocal', Date)).toBe(Date);
      expect(inferType(DtoExemplo, 'classeLocal')).toBeUndefined();
    });

    it('classe importada só como tipo vira Function → devolve o override (limitação caracterizada)', () => {
      expect(inferType(DtoExemplo, 'soTipo', String)).toBe(String);
      expect(inferType(DtoExemplo, 'soTipo')).toBeUndefined();
    });

    it('sem decorator (ou chave inexistente) não há metadado → devolve o override', () => {
      expect(inferType(DtoExemplo, 'semDecorator', Boolean)).toBe(Boolean);
      expect(inferType(DtoExemplo, 'semDecorator')).toBeUndefined();
      expect(inferType(DtoExemplo, 'naoExiste', Number)).toBe(Number);
    });

    it('o override é fallback: tipo suportado real vence', () => {
      expect(inferType(DtoExemplo, 'texto', Number)).toBe(String);
    });

    it('aceita construtor, protótipo e instância', () => {
      const instancia = new DtoExemplo();
      expect(inferType(DtoExemplo.prototype, 'numero')).toBe(Number);
      expect(inferType(instancia, 'numero')).toBe(Number);
    });
  });

  describe('caracterização bruta do emitDecoratorMetadata (limitações)', () => {
    it('união e null/undefined explícitos degradam para Object', () => {
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'uniao')).toBe(Object);
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'nulo')).toBe(Object);
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'indefinido')).toBe(Object);
    });

    it('opcional (`?`) preserva o tipo; só `| undefined` explícito degrada', () => {
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'opcional')).toBe(Number);
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'indefinido')).toBe(Object);
    });

    it('array emite Array', () => {
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'lista')).toBe(Array);
    });

    it('classe via `import type` emite Function (import elidido)', () => {
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'soTipo')).toBe(Function);
    });

    it('propriedade sem decorator não recebe metadado algum', () => {
      expect(Reflect.getMetadata('design:type', DtoExemplo.prototype, 'semDecorator')).toBeUndefined();
    });
  });
});
