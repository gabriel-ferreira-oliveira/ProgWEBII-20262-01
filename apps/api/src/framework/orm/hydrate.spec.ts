import { Column, Entity, PrimaryKey } from './entity';
import { dehydrate, hydrate } from './hydrate';

@Entity('movies')
class Movie {
  @PrimaryKey({ autoIncrement: false })
  id!: number;

  @Column()
  title!: string;

  @Column({ type: Number, nullable: true })
  durationMin!: number | null;

  @Column()
  active!: boolean;

  @Column({ type: Date, nullable: true })
  releasedAt!: Date | null;
}

class SemEntidade {
  title!: string;
}

describe('hidratação e desidratação (T5.2)', () => {
  it('hidrata a linha: snake→camel, boolean 0/1, Date em texto ISO e null', () => {
    const movie = hydrate(Movie, {
      id: 7,
      title: 'Matrix',
      duration_min: 136,
      active: 1,
      released_at: '1999-03-31T00:00:00.000Z',
    });

    expect(movie).toBeInstanceOf(Movie);
    expect(movie.id).toBe(7);
    expect(movie.durationMin).toBe(136);
    expect(movie.active).toBe(true);
    expect(movie.releasedAt).toBeInstanceOf(Date);
    expect(movie.releasedAt?.toISOString()).toBe('1999-03-31T00:00:00.000Z');
  });

  it('null do banco vira null (e boolean 0 vira false)', () => {
    const movie = hydrate(Movie, {
      id: 1,
      title: 'X',
      duration_min: null,
      active: 0,
      released_at: null,
    });

    expect(movie.durationMin).toBeNull();
    expect(movie.active).toBe(false);
    expect(movie.releasedAt).toBeNull();
  });

  it('chave fora dos metadados é ignorada e coluna ausente não sobrescreve a propriedade', () => {
    const movie = hydrate(Movie, { id: 1, title: 'X', extra: 'nao deveria entrar' });

    expect('extra' in movie).toBe(false);
    expect(movie.durationMin).toBeUndefined();
  });

  it('desidrata a instância: camel→snake, boolean 0/1 e Date em texto ISO', () => {
    const movie = new Movie();
    movie.id = 7;
    movie.title = 'Matrix';
    movie.durationMin = null;
    movie.active = true;
    movie.releasedAt = new Date('1999-03-31T00:00:00.000Z');

    expect(dehydrate(Movie, movie)).toEqual({
      id: 7,
      title: 'Matrix',
      duration_min: null,
      active: 1,
      released_at: '1999-03-31T00:00:00.000Z',
    });
  });

  it('propriedade undefined é omitida (o banco decide default/inalterado)', () => {
    const movie = new Movie();
    movie.id = 7;
    movie.title = 'Matrix';
    movie.active = false;

    expect(dehydrate(Movie, movie)).toEqual({
      id: 7,
      title: 'Matrix',
      active: 0,
    });
  });

  it('ida e volta preserva a linha original', () => {
    const row = {
      id: 7,
      title: 'Matrix',
      duration_min: 136,
      active: 1,
      released_at: '1999-03-31T00:00:00.000Z',
    };

    expect(dehydrate(Movie, hydrate(Movie, row))).toEqual(row);
  });

  it('sem metadados de entidade, falha apontando a classe', () => {
    expect(() => hydrate(SemEntidade as new () => SemEntidade, { title: 'X' })).toThrow(
      /SemEntidade.*não tem metadados/,
    );
    expect(() => dehydrate(SemEntidade as new () => SemEntidade, new SemEntidade())).toThrow(
      /SemEntidade.*não tem metadados/,
    );
  });
});
