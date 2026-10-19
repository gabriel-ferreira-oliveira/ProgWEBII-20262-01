/**
 * Migrations SQL do projeto — fonte única (T5.11; dona do schema desde a T5.12).
 *
 * O `MigrationRunner` do mini-ORM aplica estes comandos e registra a migration na tabela
 * `migrations`. Nomes/timestamps são os da era TypeORM (`InitialSchema1730000000000`) de
 * propósito: bancos já criados por ele são reconhecidos como migrados e o runner pula.
 */
import type { OrmMigration } from '../../framework/orm/migration-runner';

export const initialSchemaMigration: OrmMigration = {
  name: 'InitialSchema1730000000000',
  timestamp: 1730000000000,
  up: [
    `
      CREATE TABLE "users" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "email" text COLLATE NOCASE NOT NULL,
        "password_hash" text NOT NULL,
        "name" text NOT NULL,
        "country" text,
        "age" integer,
        "bio" text,
        "watched_movie_minutes" integer NOT NULL DEFAULT (0),
        "watched_series_minutes" integer NOT NULL DEFAULT (0),
        "total_minutes" integer NOT NULL DEFAULT (0),
        "created_at" text NOT NULL,
        "deleted_at" text
      )
    `,
    `CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email" COLLATE NOCASE)`,
    `
      CREATE TABLE "movies" (
        "id" integer PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "genre" text,
        "synopsis" text,
        "year" integer,
        "duration_min" integer,
        "created_at" text NOT NULL,
        "deleted_at" text
      )
    `,
    `CREATE INDEX "idx_movies_deleted_at" ON "movies" ("deleted_at")`,
    `
      CREATE TABLE "series" (
        "id" integer PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "genre" text,
        "synopsis" text,
        "year" integer,
        "duration_min" integer,
        "episodes" integer,
        "season" integer NOT NULL DEFAULT (0),
        "created_at" text NOT NULL,
        "deleted_at" text
      )
    `,
    `CREATE INDEX "idx_series_deleted_at" ON "series" ("deleted_at")`,
    `
      CREATE TABLE "watched_movies" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" integer NOT NULL,
        "movie_id" integer,
        "title_snapshot" text NOT NULL,
        "position" integer NOT NULL,
        "created_at" text NOT NULL,
        CONSTRAINT "fk_watched_movies_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_watched_movies_movie" FOREIGN KEY ("movie_id") REFERENCES "movies" ("id") ON DELETE SET NULL
      )
    `,
    `CREATE INDEX "idx_watched_movies_user" ON "watched_movies" ("user_id", "position")`,
    `
      CREATE TABLE "watched_series" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" integer NOT NULL,
        "series_id" integer,
        "title_snapshot" text NOT NULL,
        "position" integer NOT NULL,
        "created_at" text NOT NULL,
        CONSTRAINT "fk_watched_series_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_watched_series_series" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE SET NULL
      )
    `,
    `CREATE INDEX "idx_watched_series_user" ON "watched_series" ("user_id", "position")`,
    `
      CREATE TABLE "favorites" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "user_id" integer NOT NULL,
        "media_type" text NOT NULL,
        "movie_id" integer,
        "series_id" integer,
        "title_snapshot" text NOT NULL,
        "position" integer NOT NULL,
        "created_at" text NOT NULL,
        CONSTRAINT "chk_favorites_media_type" CHECK ("media_type" IN ('movie','series')),
        CONSTRAINT "fk_favorites_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_favorites_movie" FOREIGN KEY ("movie_id") REFERENCES "movies" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_favorites_series" FOREIGN KEY ("series_id") REFERENCES "series" ("id") ON DELETE SET NULL
      )
    `,
    `CREATE INDEX "idx_favorites_user" ON "favorites" ("user_id", "position")`,
  ],
  down: [
    `DROP TABLE "favorites"`,
    `DROP TABLE "watched_series"`,
    `DROP TABLE "watched_movies"`,
    `DROP TABLE "series"`,
    `DROP TABLE "movies"`,
    `DROP TABLE "users"`,
  ],
};

export const sqlMigrations: readonly OrmMigration[] = [initialSchemaMigration];
