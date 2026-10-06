import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequestNotesListIndex1710000001000 implements MigrationInterface {
  name = 'RequestNotesListIndex1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_request_notes_request_id_created_at
      ON request_notes (request_id, created_at DESC, id DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_request_notes_request_id_created_at;
    `);
  }
}
