import { LegacyRejection } from './types';

export interface ReportCounts {
  movies: number;
  series: number;
  users: number;
  usersWithCredentials: number;
  usersWithoutCredentials: number;
  watchedMovies: number;
  watchedSeries: number;
  favorites: number;
  passwordsHashed: number;
}

export interface ReportReconciliation {
  credentialsOnlyInUsersFile: string[];
  profilesOnlyInPerfilFile: string[];
  duplicateCredentialEmails: string[];
  duplicateProfileEmails: string[];
  infoEmailMismatch: string[];
  orphanMovieTitles: string[];
  orphanSeriesTitles: string[];
  orphanFavoriteTitles: string[];
  ambiguousFavoriteTitles: string[];
  duplicateCatalogMovieTitles: string[];
  duplicateCatalogSeriesTitles: string[];
  countryDistribution: Record<string, number>;
}

export interface MigrationReport {
  generatedAt: string;
  databasePath: string;
  legacyDir: string;
  counts: ReportCounts;
  warnings: string[];
  rejections: LegacyRejection[];
  reconciliation: ReportReconciliation;
}

function list(items: readonly string[]): string {
  if (items.length === 0) {
    return '_nenhum_';
  }
  return items.map((item) => `- ${item}`).join('\n');
}

export function toJson(report: MigrationReport): string {
  return JSON.stringify(report, null, 2);
}

export function toMarkdown(report: MigrationReport): string {
  const { counts, reconciliation: rec, rejections, warnings } = report;
  const countryRows = Object.entries(rec.countryDistribution)
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join('\n');
  const rejectionRows =
    rejections.length === 0
      ? '| - | - | - | - |'
      : rejections
          .map(
            (r) =>
              `| ${r.source} | ${r.lineNumber} | ${r.reason} | \`${r.raw.slice(0, 80).replace(/\|/g, '\\|')}\` |`,
          )
          .join('\n');

  return `# Relatorio de migracao do legado CeViu

Gerado em: ${report.generatedAt}
Banco: \`${report.databasePath}\`
Origem: \`${report.legacyDir}\`

## Contagens importadas

| Entidade | Qtd |
|---|---|
| movies | ${counts.movies} |
| series | ${counts.series} |
| users | ${counts.users} |
| users (com credencial) | ${counts.usersWithCredentials} |
| users (sem credencial) | ${counts.usersWithoutCredentials} |
| watched_movies | ${counts.watchedMovies} |
| watched_series | ${counts.watchedSeries} |
| favorites | ${counts.favorites} |
| senhas com hash (bcrypt) | ${counts.passwordsHashed} |

## Reconciliacao

**Credenciais sem perfil correspondente em Perfil.txt**
${list(rec.credentialsOnlyInUsersFile)}

**Perfis sem credencial correspondente em Usuarios.txt**
${list(rec.profilesOnlyInPerfilFile)}

**E-mails de credencial duplicados (case-insensitive)**
${list(rec.duplicateCredentialEmails)}

**E-mails de perfil duplicados (case-insensitive)**
${list(rec.duplicateProfileEmails)}

**Divergencia entre e-mail do cabecalho e do campo Informacao**
${list(rec.infoEmailMismatch)}

**Titulos de filmes assistidos sem correspondencia no catalogo (orfaos)**
${list(rec.orphanMovieTitles)}

**Titulos de series assistidas sem correspondencia no catalogo (orfaos)**
${list(rec.orphanSeriesTitles)}

**Favoritos sem correspondencia no catalogo (orfaos)**
${list(rec.orphanFavoriteTitles)}

**Favoritos ambiguos (existem como filme e serie)**
${list(rec.ambiguousFavoriteTitles)}

**Titulos de filme duplicados no catalogo**
${list(rec.duplicateCatalogMovieTitles)}

**Titulos de serie duplicados no catalogo**
${list(rec.duplicateCatalogSeriesTitles)}

## Distribuicao de pais

| Pais | Qtd |
|---|---|
${countryRows || '| - | - |'}

## Linhas rejeitadas

| Arquivo | Linha | Motivo | Conteudo |
|---|---|---|---|
${rejectionRows}

## Avisos

${list(warnings)}
`;
}
