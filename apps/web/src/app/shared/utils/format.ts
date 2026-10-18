/** Formatacao de campos numericos/opcionais dos DTOs (legado sempre tinha valores). */
export function formatNumber(value: number | null): string {
  return value === null ? '-' : String(value);
}

export function formatText(value: string | null): string {
  return value ?? '';
}

/** Caminho da capa no catalogo publico (o componente tenta .png e depois .jpg). */
export function caminhoImagemFilme(id: number): string {
  return `imagens/filmes/${id}`;
}

export function caminhoImagemSerie(id: number): string {
  return `imagens/series/${id}`;
}

export const CAMINHO_AVATAR = 'imagens/perfil';
