import type { FieldMetadata } from '@ceviu/shared';
import { payloadFromFields } from './payload';

function campo(parcial: Partial<FieldMetadata> & Pick<FieldMetadata, 'name'>): FieldMetadata {
  return { label: parcial.name, control: 'text', order: 1, required: false, ...parcial };
}

describe('payloadFromFields', () => {
  it('usa os nomes do descritor e converte control number', () => {
    const fields = [
      campo({ name: 'name' }),
      campo({ name: 'age', control: 'number' }),
      campo({ name: 'bio', control: 'textarea' }),
    ];

    const payload = payloadFromFields(fields, { name: 'Gabriel', age: '21', bio: 'Sobre mim' });

    expect(payload).toEqual({ name: 'Gabriel', age: 21, bio: 'Sobre mim' });
  });

  it('campo sem valor nos dados vira string vazia', () => {
    const payload = payloadFromFields([campo({ name: 'bio' })], {});

    expect(payload).toEqual({ bio: '' });
  });

  it('valores fora do descritor sao ignorados', () => {
    const payload = payloadFromFields([campo({ name: 'email' })], {
      email: 'g@e.com',
      extra: 'nao vai',
    });

    expect(payload).toEqual({ email: 'g@e.com' });
  });
});
