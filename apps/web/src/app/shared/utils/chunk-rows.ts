/** Divide uma lista em linhas de tamanho fixo (reproduz os GridLayout do legado). */
export function chunkRows<T>(items: readonly T[], size: number): readonly (readonly T[])[] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}
