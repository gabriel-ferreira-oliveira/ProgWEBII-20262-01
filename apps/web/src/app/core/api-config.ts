/**
 * Configuracao de acesso a API do CeViu.
 * O backend roda com prefixo global `/api` (ver apps/api/src/setup-app.ts)
 * e CORS liberado para http://localhost:4200 (origem padrao do `ng serve`).
 */
export const API_BASE_URL = 'http://localhost:3000/api';

/** Pasta publica das imagens do legado (copiadas para apps/web/public/imagens). */
export const IMAGES_BASE_PATH = 'imagens';
