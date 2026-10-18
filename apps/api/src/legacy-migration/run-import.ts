import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../database/data-source';
import {
  Favorite,
  Movie,
  Series,
  User,
  WatchedMovie,
  WatchedSeries,
} from '../database/entities';
import { dataDir, databasePath, legacyDir } from '../common/paths';
import { parseLegacy } from './legacy-parser';
import { MigrationReport, ReportReconciliation, toJson, toMarkdown } from './report';
import { ParsedCredential, ParsedProfile } from './types';

function readLegacyFile(name: string): string {
  return fs.readFileSync(path.join(legacyDir(), name), 'utf8');
}

function toTitleMap<T extends { id: number; title: string }>(items: readonly T[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.title.trim();
    if (!map.has(key)) {
      map.set(key, item.id);
    }
  }
  return map;
}

function duplicateTitles<T extends { title: string }>(items: readonly T[]): string[] {
  const counter = new Map<string, number>();
  for (const item of items) {
    const key = item.title.trim();
    counter.set(key, (counter.get(key) ?? 0) + 1);
  }
  const duplicates: string[] = [];
  for (const [key, count] of counter) {
    if (count > 1) {
      duplicates.push(key);
    }
  }
  return duplicates;
}

function emptyReconciliation(): ReportReconciliation {
  return {
    credentialsOnlyInUsersFile: [],
    profilesOnlyInPerfilFile: [],
    duplicateCredentialEmails: [],
    duplicateProfileEmails: [],
    infoEmailMismatch: [],
    orphanMovieTitles: [],
    orphanSeriesTitles: [],
    orphanFavoriteTitles: [],
    ambiguousFavoriteTitles: [],
    duplicateCatalogMovieTitles: [],
    duplicateCatalogSeriesTitles: [],
    countryDistribution: {},
  };
}

async function main(): Promise<void> {
  const parsedRounds = Number.parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const rounds = Number.isInteger(parsedRounds) && parsedRounds > 0 ? parsedRounds : 10;

  const parsed = parseLegacy({
    movies: readLegacyFile('Filmes.txt'),
    series: readLegacyFile('Series.txt'),
    users: readLegacyFile('Usuarios.txt'),
    profiles: readLegacyFile('Perfil.txt'),
  });

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  await AppDataSource.runMigrations();

  const warnings: string[] = [];
  const reconciliation = emptyReconciliation();
  let passwordsHashed = 0;
  let watchedMoviesCount = 0;
  let watchedSeriesCount = 0;
  let favoritesCount = 0;

  const movieByTitle = toTitleMap(parsed.movies);
  const seriesByTitle = toTitleMap(parsed.series);
  reconciliation.duplicateCatalogMovieTitles = duplicateTitles(parsed.movies);
  reconciliation.duplicateCatalogSeriesTitles = duplicateTitles(parsed.series);

  const credentialsByEmail = new Map<string, ParsedCredential>();
  for (const credential of parsed.credentials) {
    const key = credential.email.toLowerCase();
    if (credentialsByEmail.has(key)) {
      reconciliation.duplicateCredentialEmails.push(credential.email);
      continue;
    }
    credentialsByEmail.set(key, credential);
  }

  const profilesByEmail = new Map<string, ParsedProfile>();
  for (const profile of parsed.profiles) {
    const key = profile.email.toLowerCase();
    if (profilesByEmail.has(key)) {
      reconciliation.duplicateProfileEmails.push(profile.email);
      continue;
    }
    profilesByEmail.set(key, profile);
    if (profile.infoEmail !== null && profile.infoEmail.toLowerCase() !== key) {
      reconciliation.infoEmailMismatch.push(`${profile.email} <> ${profile.infoEmail}`);
    }
    const countryKey = profile.country ?? '(null)';
    reconciliation.countryDistribution[countryKey] =
      (reconciliation.countryDistribution[countryKey] ?? 0) + 1;
  }

  const allKeys = new Set<string>([...credentialsByEmail.keys(), ...profilesByEmail.keys()]);
  for (const key of allKeys) {
    if (!profilesByEmail.has(key)) {
      reconciliation.credentialsOnlyInUsersFile.push(credentialsByEmail.get(key)?.email ?? key);
    }
    if (!credentialsByEmail.has(key)) {
      reconciliation.profilesOnlyInPerfilFile.push(profilesByEmail.get(key)?.email ?? key);
    }
  }

  const orphanMovieTitles = new Set<string>();
  const orphanSeriesTitles = new Set<string>();
  const orphanFavoriteTitles = new Set<string>();
  const ambiguousFavoriteTitles = new Set<string>();

  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(Favorite).clear();
    await manager.getRepository(WatchedMovie).clear();
    await manager.getRepository(WatchedSeries).clear();
    await manager.getRepository(User).clear();
    await manager.getRepository(Movie).clear();
    await manager.getRepository(Series).clear();

    const movieRepo = manager.getRepository(Movie);
    await movieRepo.save(
      parsed.movies.map((movie) =>
        movieRepo.create({
          id: movie.id,
          title: movie.title,
          genre: movie.genre,
          synopsis: movie.synopsis,
          year: movie.year,
          durationMin: movie.durationMin,
        }),
      ),
    );

    const seriesRepo = manager.getRepository(Series);
    await seriesRepo.save(
      parsed.series.map((serie) =>
        seriesRepo.create({
          id: serie.id,
          title: serie.title,
          genre: serie.genre,
          synopsis: serie.synopsis,
          year: serie.year,
          durationMin: serie.durationMin,
          episodes: serie.episodes,
          season: 0,
        }),
      ),
    );

    const userRepo = manager.getRepository(User);
    const userIdByEmail = new Map<string, number>();
    for (const key of allKeys) {
      const profile = profilesByEmail.get(key);
      const credential = credentialsByEmail.get(key);
      const email = profile?.email ?? credential?.email ?? key;

      let passwordHash: string;
      if (credential) {
        passwordHash = await bcrypt.hash(credential.password, rounds);
        passwordsHashed += 1;
      } else {
        passwordHash = await bcrypt.hash(randomUUID(), rounds);
        passwordsHashed += 1;
        warnings.push(`Usuario "${email}" sem credencial em Usuarios.txt; senha aleatoria definida.`);
      }

      const saved = await userRepo.save(
        userRepo.create({
          email,
          passwordHash,
          name: profile?.name ?? email,
          country: profile?.country ?? null,
          age: profile?.age ?? null,
          bio: profile?.bio ?? null,
          watchedMovieMinutes: profile?.timeMovie ?? 0,
          watchedSeriesMinutes: profile?.timeSeries ?? 0,
          totalMinutes: profile?.timeTotal ?? 0,
        }),
      );
      userIdByEmail.set(key, saved.id);
    }

    const watchedMovieRepo = manager.getRepository(WatchedMovie);
    const watchedSeriesRepo = manager.getRepository(WatchedSeries);
    const favoriteRepo = manager.getRepository(Favorite);

    for (const profile of parsed.profiles) {
      const userId = userIdByEmail.get(profile.email.toLowerCase());
      if (userId === undefined) {
        warnings.push(`Perfil "${profile.email}" ignorado (usuario nao criado).`);
        continue;
      }

      if (profile.watchedMovies.length > 0) {
        const rows = profile.watchedMovies.map((title, position) => {
          const resolved = movieByTitle.get(title.trim());
          if (resolved === undefined) {
            orphanMovieTitles.add(title.trim());
          }
          return watchedMovieRepo.create({
            userId,
            movieId: resolved ?? null,
            titleSnapshot: title,
            position,
          });
        });
        await watchedMovieRepo.save(rows);
        watchedMoviesCount += rows.length;
      }

      if (profile.watchedSeries.length > 0) {
        const rows = profile.watchedSeries.map((title, position) => {
          const resolved = seriesByTitle.get(title.trim());
          if (resolved === undefined) {
            orphanSeriesTitles.add(title.trim());
          }
          return watchedSeriesRepo.create({
            userId,
            seriesId: resolved ?? null,
            titleSnapshot: title,
            position,
          });
        });
        await watchedSeriesRepo.save(rows);
        watchedSeriesCount += rows.length;
      }

      if (profile.favorites.length > 0) {
        const rows = profile.favorites.map((title, position) => {
          const trimmed = title.trim();
          const movieId = movieByTitle.get(trimmed);
          const seriesId = seriesByTitle.get(trimmed);
          let mediaType = 'movie';
          let resolvedMovieId: number | null = null;
          let resolvedSeriesId: number | null = null;

          if (movieId !== undefined && seriesId !== undefined) {
            ambiguousFavoriteTitles.add(trimmed);
            resolvedMovieId = movieId;
          } else if (movieId !== undefined) {
            resolvedMovieId = movieId;
          } else if (seriesId !== undefined) {
            mediaType = 'series';
            resolvedSeriesId = seriesId;
          } else {
            orphanFavoriteTitles.add(trimmed);
          }

          return favoriteRepo.create({
            userId,
            mediaType,
            movieId: resolvedMovieId,
            seriesId: resolvedSeriesId,
            titleSnapshot: title,
            position,
          });
        });
        await favoriteRepo.save(rows);
        favoritesCount += rows.length;
      }
    }
  });

  reconciliation.orphanMovieTitles = [...orphanMovieTitles];
  reconciliation.orphanSeriesTitles = [...orphanSeriesTitles];
  reconciliation.orphanFavoriteTitles = [...orphanFavoriteTitles];
  reconciliation.ambiguousFavoriteTitles = [...ambiguousFavoriteTitles];

  const report: MigrationReport = {
    generatedAt: new Date().toISOString(),
    databasePath: databasePath(),
    legacyDir: legacyDir(),
    counts: {
      movies: parsed.movies.length,
      series: parsed.series.length,
      users: allKeys.size,
      usersWithCredentials: credentialsByEmail.size,
      usersWithoutCredentials: allKeys.size - credentialsByEmail.size,
      watchedMovies: watchedMoviesCount,
      watchedSeries: watchedSeriesCount,
      favorites: favoritesCount,
      passwordsHashed,
    },
    warnings,
    rejections: [...parsed.rejections],
    reconciliation,
  };

  const jsonPath = path.join(dataDir(), 'migration-report.json');
  const mdPath = path.join(dataDir(), 'migration-report.md');
  fs.writeFileSync(jsonPath, toJson(report), 'utf8');
  fs.writeFileSync(mdPath, toMarkdown(report), 'utf8');

  await AppDataSource.destroy();

  console.log('Migracao concluida.');
  console.log(`  Filmes:           ${report.counts.movies}`);
  console.log(`  Series:           ${report.counts.series}`);
  console.log(`  Usuarios:         ${report.counts.users}`);
  console.log(`  Filmes assist.:   ${report.counts.watchedMovies}`);
  console.log(`  Series assist.:   ${report.counts.watchedSeries}`);
  console.log(`  Favoritos:        ${report.counts.favorites}`);
  console.log(`  Senhas (bcrypt):  ${report.counts.passwordsHashed}`);
  console.log(`  Linhas rejeit.:   ${report.rejections.length}`);
  console.log(`  Avisos:           ${report.warnings.length}`);
  console.log(`  Relatorio JSON:   ${jsonPath}`);
  console.log(`  Relatorio MD:     ${mdPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error('Falha na migracao:');
  console.error(message);
  process.exitCode = 1;
});
