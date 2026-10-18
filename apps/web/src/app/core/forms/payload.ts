import type { FieldMetadata } from '@ceviu/shared';

/**
 * Payload do formulario montado a partir do descritor (`FieldMetadata[]`): usa os nomes
 * das propriedades do DTO (contrato — T3.2/T3.4) e converte `control: 'number'` com
 * `Number.parseInt` (paridade com o `Integer.parseInt` do legado).
 * O chamador afirma o tipo do DTO (`as unknown as ...`) porque o descritor e dinamico;
 * os testes de componente asseveram o corpo exato enviado.
 */
export function payloadFromFields(
  fields: FieldMetadata[],
  valores: Record<string, string>,
): Record<string, string | number> {
  const payload: Record<string, string | number> = {};
  for (const campo of fields) {
    const valor = valores[campo.name] ?? '';
    payload[campo.name] = campo.control === 'number' ? Number.parseInt(valor, 10) : valor;
  }
  return payload;
}
