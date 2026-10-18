import * as path from 'node:path';

/**
 * Raiz do monorepo. Calculada a partir deste arquivo:
 * apps/api/src/common -> ../../../../ = raiz.
 * (Em build dist/common o numero de niveis e o mesmo.)
 */
export function repoRoot(): string {
  return path.resolve(__dirname, '..', '..', '..', '..');
}

export function dataDir(): string {
  const override = process.env.CEVIU_DATA_DIR;
  return override ? path.resolve(repoRoot(), override) : path.join(repoRoot(), 'data');
}

export function legacyDir(): string {
  return path.join(dataDir(), 'legacy');
}

export function databasePath(): string {
  const override = process.env.DATABASE_PATH;
  return override ? path.resolve(repoRoot(), override) : path.join(dataDir(), 'ceviu.sqlite');
}
