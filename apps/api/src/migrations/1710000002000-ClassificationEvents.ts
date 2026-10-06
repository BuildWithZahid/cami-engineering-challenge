import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClassificationEvents1710000002000 implements MigrationInterface {
  name = 'ClassificationEvents1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS classification_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id uuid NULL REFERENCES customer_requests(id) ON DELETE SET NULL,
        message text NOT NULL,
        category varchar(32) NOT NULL,
        confidence double precision NOT NULL,
        provider varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_classification_events_created_at
      ON classification_events (created_at DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_classification_events_category_created_at
      ON classification_events (category, created_at DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS classification_events;`);
  }
}
