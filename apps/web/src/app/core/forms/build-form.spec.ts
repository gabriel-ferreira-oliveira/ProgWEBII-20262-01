import { NonNullableFormBuilder } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import type { FieldMetadata } from '@ceviu/shared';
import { buildForm } from './build-form';

function campo(parcial: Partial<FieldMetadata> & Pick<FieldMetadata, 'name'>): FieldMetadata {
  return { label: parcial.name, control: 'text', order: 1, required: false, ...parcial };
}

describe('buildForm', () => {
  let formBuilder: NonNullableFormBuilder;

  beforeEach(() => {
    formBuilder = TestBed.inject(NonNullableFormBuilder);
  });

  it('cria um controle string por campo do descritor', () => {
    const form = buildForm(formBuilder, [
      campo({ name: 'name', required: true }),
      campo({ name: 'bio' }),
    ]);

    expect(Object.keys(form.controls)).toEqual(['name', 'bio']);
    expect(form.controls['name'].value).toBe('');
    expect(form.controls['bio']).toBeTruthy();
  });

  it('required: vazio é inválido (required); preenchido é válido', () => {
    const form = buildForm(formBuilder, [campo({ name: 'name', required: true })]);

    expect(form.controls['name'].errors).toEqual({ required: true });

    form.controls['name'].setValue('Gabriel');
    expect(form.controls['name'].errors).toBeNull();
  });

  it('sem required: vazio continua válido', () => {
    const form = buildForm(formBuilder, [campo({ name: 'bio' })]);

    expect(form.controls['bio'].valid).toBe(true);
  });

  it('min: abaixo do minimo é inválido (min); no limite é valido', () => {
    const form = buildForm(formBuilder, [campo({ name: 'age', required: true, min: 0 })]);

    form.controls['age'].setValue('-1');
    expect(form.controls['age'].errors).toEqual({ min: { min: 0, actual: '-1' } });

    form.controls['age'].setValue('0');
    expect(form.controls['age'].errors).toBeNull();

    form.controls['age'].setValue('21');
    expect(form.controls['age'].valid).toBe(true);
  });

  it('maxLength: excedente é inválido; no limite é valido', () => {
    const form = buildForm(formBuilder, [campo({ name: 'bio', maxLength: 4 })]);

    form.controls['bio'].setValue('abcde');
    expect(form.controls['bio'].errors).toEqual({ maxlength: { requiredLength: 4, actualLength: 5 } });

    form.controls['bio'].setValue('abcd');
    expect(form.controls['bio'].valid).toBe(true);
  });

  it('pattern: converte a string delimitada em regex (com flags) e valida', () => {
    const form = buildForm(formBuilder, [campo({ name: 'idade', pattern: '/^\\d+$/' })]);
    const idade = form.controls['idade'];

    idade.setValue('021');
    expect(idade.errors).toBeNull();

    idade.setValue('12a');
    expect(idade.errors).toEqual({ pattern: { requiredPattern: '/^\\d+$/', actualValue: '12a' } });

    const comFlags = buildForm(formBuilder, [campo({ name: 'codigo', pattern: '/^a$/i' })]);
    comFlags.controls['codigo'].setValue('A');
    expect(comFlags.controls['codigo'].errors).toBeNull();
  });

  it('metadados do cadastro reproduzem o comportamento da tela atual', () => {
    const form = buildForm(formBuilder, [
      campo({ name: 'name', label: 'Nome', order: 1, required: true }),
      campo({ name: 'age', label: 'Idade', control: 'number', order: 2, required: true, min: 0 }),
      campo({ name: 'bio', label: 'Sobre', control: 'textarea', order: 3 }),
    ]);

    expect(form.valid).toBe(false);

    form.controls['name'].setValue('Gabriel');
    form.controls['age'].setValue('21');
    expect(form.valid).toBe(true);
  });
});
