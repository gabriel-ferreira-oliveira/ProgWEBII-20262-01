import { Column, Entity, PrimaryKey, getEntityMeta } from './entity';

@Entity('movies')
class Movie {
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column()
  title!: string;

  @Column({ name: 'duration_min', type: Number, nullable: true })
  durationMin!: number | null;

  @Column({ type: String, nullable: true, unique: true })
  genre!: string | null;
}

@Entity('users')
class User {
  @PrimaryKey()
  id!: number;

  @Column({ type: String })
  createdAt!: string | null;
}

class SemEntidade {
  @Column()
  title!: string;
}

class Base {
  @Column({ type: String })
  createdAt!: string | null;
}

@Entity('herdada')
class Herdada extends Base {
  @Column()
  title!: string;
}

describe('metadados de entidade do mini-ORM (T5.1)', () => {
  it('compõe EntityMeta com a tabela e as colunas na ordem de declaração', () => {
    const meta = getEntityMeta(Movie);

    expect(meta?.table).toBe('movies');
    expect(meta?.columns.map((column) => column.property)).toEqual([
      'id',
      'title',
      'durationMin',
      'genre',
    ]);
  });

  it('coluna simples: tipo pelo design:type e padrões fechados (não nulo, não única, não chave)', () => {
    const meta = getEntityMeta(Movie);

    expect(meta?.columns[1]).toEqual({
      property: 'title',
      name: 'title',
      type: String,
      nullable: false,
      unique: false,
      primaryKey: false,
      autoIncrement: false,
    });
  });

  it('snake_case no nome por padrão e name explícito vence', () => {
    const meta = getEntityMeta(Movie);

    expect(meta?.columns[2].name).toBe('duration_min');
    expect(meta?.columns[3].name).toBe('genre');
  });

  it('type explícito vence quando o design:type degrada para Object (união com null)', () => {
    const meta = getEntityMeta(Movie);

    expect(meta?.columns[2].type).toBe(Number);
    expect(meta?.columns[3].type).toBe(String);
    expect(meta?.columns[3].nullable).toBe(true);
    expect(meta?.columns[3].unique).toBe(true);
  });

  it('@PrimaryKey marca a coluna, default autoIncrement true e false respeitado', () => {
    const movieId = getEntityMeta(Movie)?.columns[0];
    const userId = getEntityMeta(User)?.columns[0];

    expect(movieId?.primaryKey).toBe(true);
    expect(movieId?.autoIncrement).toBe(false);
    expect(userId?.primaryKey).toBe(true);
    expect(userId?.autoIncrement).toBe(true);
    expect(movieId?.nullable).toBe(false);
  });

  it('tipo não inferível sem type explícito: erro apontando a coluna', () => {
    expect(() => {
      class Invalida {
        @Column()
        genre!: string | null;
      }
      void Invalida;
    }).toThrow(/genre.*precisa de type/);
  });

  it('sem @Entity não há EntityMeta', () => {
    expect(getEntityMeta(SemEntidade)).toBeUndefined();
  });

  it('colunas mesclam pela cadeia de herança (raiz primeiro, filha vence na mesma propriedade)', () => {
    const meta = getEntityMeta(Herdada);

    expect(meta?.table).toBe('herdada');
    expect(meta?.columns.map((column) => column.property)).toEqual(['createdAt', 'title']);
    expect(meta?.columns[0].name).toBe('created_at');
  });
});
