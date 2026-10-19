import { MigrationInterface, QueryRunner } from 'typeorm';
import { initialSchemaMigration } from './sql-migrations';

/**
 * Casca do TypeORM para o CLI dele: os comandos são os mesmos do `sql-migrations.ts` (T5.11).
 * A classe inteira desaparece na T5.12 junto com o TypeORM (o `MigrationRunner` assume).
 */
export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const sql of initialSchemaMigration.up) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const sql of initialSchemaMigration.down) {
      await queryRunner.query(sql);
    }
  }
}
