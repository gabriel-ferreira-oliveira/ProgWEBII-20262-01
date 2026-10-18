import {
  LegacyParseResult,
  LegacyRejection,
  LegacySource,
  ParsedCredential,
  ParsedMovie,
  ParsedProfile,
  ParsedSeries,
} from './types';

/**
 * Parser dos arquivos .txt legados.
 *
 * Caracteristicas reais dos dados (confirmado na Fase 0):
 * - codificacao UTF-8 sem BOM, quebra de linha CRLF, delimitador `|`.
 * - `Perfil.txt` e um arquivo em blocos, com marcadores fimFilme/fimSerie/fimFavoritos.
 *
 * Diferente do legado (que pulava linhas fixas), aqui usamos um parser tolerante:
 * linhas em branco nao quebram a leitura e tudo que for invalido vira rejeicao relatada.
 */

const REJECTED_LINE_LIMIT = 500;

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function toInt(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) {
    return null;
  }
  return Number.parseInt(trimmed, 10);
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function pushRejection(
  rejections: LegacyRejection[],
  source: LegacySource,
  lineNumber: number,
  raw: string,
  reason: string,
): void {
  if (rejections.length < REJECTED_LINE_LIMIT) {
    rejections.push({ source, lineNumber, raw, reason });
  } else if (rejections.length === REJECTED_LINE_LIMIT) {
    rejections.push({
      source,
      lineNumber,
      raw: '',
      reason: `Limite de ${REJECTED_LINE_LIMIT} rejeicoes detalhadas atingido; demais agregadas na contagem.`,
    });
  }
}

export function parseMovies(text: string, rejections: LegacyRejection[]): ParsedMovie[] {
  const out: ParsedMovie[] = [];
  splitLines(text).forEach((raw, idx) => {
    const lineNumber = idx + 1;
    const line = raw.trim();
    if (line === '') {
      return;
    }
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 6) {
      pushRejection(rejections, 'Filmes.txt', lineNumber, raw, 'Menos de 6 campos.');
      return;
    }
    const id = toInt(parts[0]);
    const title = parts[1] ?? '';
    const genre = parts[2] ?? '';
    const year = toInt(parts[parts.length - 2]);
    const durationMin = toInt(parts[parts.length - 1]);
    const synopsis = parts.slice(3, parts.length - 2).join('|');

    if (id === null || year === null || durationMin === null || title === '') {
      pushRejection(rejections, 'Filmes.txt', lineNumber, raw, 'Id/ano/duracao invalidos ou titulo vazio.');
      return;
    }
    out.push({
      id,
      title,
      genre: emptyToNull(genre),
      synopsis: emptyToNull(synopsis),
      year,
      durationMin,
    });
  });
  return out;
}

export function parseSeries(text: string, rejections: LegacyRejection[]): ParsedSeries[] {
  const out: ParsedSeries[] = [];
  splitLines(text).forEach((raw, idx) => {
    const lineNumber = idx + 1;
    const line = raw.trim();
    if (line === '') {
      return;
    }
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 7) {
      pushRejection(rejections, 'Series.txt', lineNumber, raw, 'Menos de 7 campos.');
      return;
    }
    const id = toInt(parts[0]);
    const title = parts[1] ?? '';
    const genre = parts[2] ?? '';
    const year = toInt(parts[parts.length - 3]);
    const durationMin = toInt(parts[parts.length - 2]);
    const episodes = toInt(parts[parts.length - 1]);
    const synopsis = parts.slice(3, parts.length - 3).join('|');

    if (id === null || year === null || durationMin === null || episodes === null || title === '') {
      pushRejection(
        rejections,
        'Series.txt',
        lineNumber,
        raw,
        'Id/ano/duracao/episodios invalidos ou titulo vazio.',
      );
      return;
    }
    out.push({
      id,
      title,
      genre: emptyToNull(genre),
      synopsis: emptyToNull(synopsis),
      year,
      durationMin,
      episodes,
    });
  });
  return out;
}

export function parseCredentials(text: string, rejections: LegacyRejection[]): ParsedCredential[] {
  const out: ParsedCredential[] = [];
  splitLines(text).forEach((raw, idx) => {
    const lineNumber = idx + 1;
    if (raw.trim() === '') {
      return;
    }
    const parts = raw.split('|');
    if (parts.length < 2) {
      pushRejection(rejections, 'Usuarios.txt', lineNumber, raw, 'Esperado email|senha.');
      return;
    }
    out.push({ email: parts[0], password: parts[1], lineNumber });
  });
  return out;
}

function tokensFromLines(lines: readonly string[]): string[] {
  const tokens: string[] = [];
  for (const line of lines) {
    for (const token of line.split('|')) {
      tokens.push(token);
    }
  }
  // Remove o campo vazio inicial gerado pelo formato legado ("|Titulo|...") e vazios.
  return tokens.filter((token) => token !== '');
}

function sectionLines(body: readonly string[], header: string, endMarker: string): string[] {
  const start = body.indexOf(header);
  if (start === -1) {
    return [];
  }
  const collected: string[] = [];
  for (let i = start + 1; i < body.length; i += 1) {
    const line = body[i];
    if (line === endMarker) {
      break;
    }
    if (/^\[.+\]$/.test(line)) {
      break;
    }
    collected.push(line);
  }
  return collected;
}

function valueAfter(body: readonly string[], header: string): number {
  const index = body.indexOf(header);
  if (index === -1 || index + 1 >= body.length) {
    return 0;
  }
  return toInt(body[index + 1]) ?? 0;
}

interface RawProfileBlock {
  readonly email: string;
  readonly startLine: number;
  readonly body: readonly string[];
}

function splitProfileBlocks(text: string): RawProfileBlock[] {
  const blocks: RawProfileBlock[] = [];
  let current: { email: string; startLine: number; body: string[] } | null = null;
  splitLines(text).forEach((line, idx) => {
    const match = /^\[Usuario:(.*)\]$/.exec(line);
    if (match) {
      if (current) {
        blocks.push(current);
      }
      current = { email: match[1], startLine: idx + 1, body: [] };
      return;
    }
    if (current) {
      current.body.push(line);
    }
  });
  if (current) {
    blocks.push(current);
  }
  return blocks;
}

function parseProfileBlock(block: RawProfileBlock, rejections: LegacyRejection[]): ParsedProfile {
  const { body } = block;
  let name: string | null = null;
  let country: string | null = null;
  let infoEmail: string | null = null;
  let age: number | null = null;
  let bio: string | null = null;

  const infoIndex = body.indexOf('[Informacao]');
  if (infoIndex === -1 || infoIndex + 1 >= body.length) {
    pushRejection(
      rejections,
      'Perfil.txt',
      block.startLine,
      `[Usuario:${block.email}]`,
      'Bloco sem secao [Informacao] valida.',
    );
  } else {
    const infoParts = body[infoIndex + 1].split('|');
    name = emptyToNull(infoParts[0] ?? '');
    country = infoParts.length > 1 ? emptyToNull(infoParts[1] ?? '') : null;
    infoEmail = infoParts.length > 2 ? emptyToNull(infoParts[2] ?? '') : null;
    age = infoParts.length > 3 ? toInt(infoParts[3]) : null;
    bio = infoParts.length > 4 ? emptyToNull(infoParts.slice(4).join('|')) : null;
  }

  return {
    email: block.email,
    startLine: block.startLine,
    infoEmail,
    name,
    country,
    age,
    bio,
    watchedMovies: tokensFromLines(sectionLines(body, '[FilmesAssistidos]', 'fimFilme')),
    watchedSeries: tokensFromLines(sectionLines(body, '[SeriesAssistidas]', 'fimSerie')),
    favorites: tokensFromLines(sectionLines(body, '[Favoritos]', 'fimFavoritos')),
    timeMovie: valueAfter(body, '[TempoFilme]'),
    timeSeries: valueAfter(body, '[TempoSerie]'),
    timeTotal: valueAfter(body, '[TempoTotal]'),
  };
}

export function parseProfiles(text: string, rejections: LegacyRejection[]): ParsedProfile[] {
  return splitProfileBlocks(text).map((block) => parseProfileBlock(block, rejections));
}

export function parseLegacy(files: {
  readonly movies: string;
  readonly series: string;
  readonly users: string;
  readonly profiles: string;
}): LegacyParseResult {
  const rejections: LegacyRejection[] = [];
  return {
    movies: parseMovies(files.movies, rejections),
    series: parseSeries(files.series, rejections),
    credentials: parseCredentials(files.users, rejections),
    profiles: parseProfiles(files.profiles, rejections),
    rejections,
  };
}
