import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_users_email" ON "users" ("email" COLLATE NOCASE)`,
    );

    await queryRunner.query(`
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
    `);
    await queryRunner.query(`CREATE INDEX "idx_movies_deleted_at" ON "movies" ("deleted_at")`);

    await queryRunner.query(`
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
    `);
    await queryRunner.query(`CREATE INDEX "idx_series_deleted_at" ON "series" ("deleted_at")`);

    await queryRunner.query(`
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
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_watched_movies_user" ON "watched_movies" ("user_id", "position")`,
    );

    await queryRunner.query(`
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
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_watched_series_user" ON "watched_series" ("user_id", "position")`,
    );

    await queryRunner.query(`
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
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_favorites_user" ON "favorites" ("user_id", "position")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(`DROP TABLE "watched_series"`);
    await queryRunner.query(`DROP TABLE "watched_movies"`);
    await queryRunner.query(`DROP TABLE "series"`);
    await queryRunner.query(`DROP TABLE "movies"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
