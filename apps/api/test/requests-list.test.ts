import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { createDataSource } from '../src/data-source';
import { CustomerRequest } from '../src/requests/customer-request.entity';
import { RequestsService } from '../src/requests/requests.service';

const PREFIX = `__list_perf_${Date.now()}__`;

describe('RequestsService.list', () => {
  let ds: DataSource;
  let service: RequestsService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    ds = createDataSource();
    await ds.initialize();
    await ds.runMigrations();
    service = new RequestsService(ds.getRepository(CustomerRequest));
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await ds.query('DELETE FROM customer_requests WHERE id = ANY($1::uuid[])', [
        createdIds,
      ]);
    }
    if (ds?.isInitialized) {
      await ds.destroy();
    }
  });

  it('returns correct note counts and the latest note preview', async () => {
    const older = new Date('2026-01-01T10:00:00.000Z');
    const newer = new Date('2026-01-01T12:00:00.000Z');
    const newestRequest = new Date('2026-01-02T00:00:00.000Z');
    const olderRequest = new Date('2026-01-01T00:00:00.000Z');

    const [withNotes] = await ds.query<{ id: string }[]>(
      `INSERT INTO customer_requests (message, status, created_at, updated_at)
       VALUES ($1, 'open', $2, $2)
       RETURNING id`,
      [`${PREFIX} with notes`, newestRequest],
    );
    const [withoutNotes] = await ds.query<{ id: string }[]>(
      `INSERT INTO customer_requests (message, status, created_at, updated_at)
       VALUES ($1, 'open', $2, $2)
       RETURNING id`,
      [`${PREFIX} no notes`, olderRequest],
    );
    createdIds.push(withNotes.id, withoutNotes.id);

    await ds.query(
      `INSERT INTO request_notes (request_id, body, author_name, created_at)
       VALUES
         ($1, 'older note', 'Alex', $2),
         ($1, 'latest note', 'Sam', $3)`,
      [withNotes.id, older, newer],
    );

    const items = await service.list();
    const noted = items.find((row) => row.id === withNotes.id);
    const empty = items.find((row) => row.id === withoutNotes.id);

    expect(noted).toMatchObject({
      message: `${PREFIX} with notes`,
      noteCount: 2,
      latestNotePreview: 'latest note',
    });
    expect(empty).toMatchObject({
      message: `${PREFIX} no notes`,
      noteCount: 0,
      latestNotePreview: null,
    });

    const notedIndex = items.findIndex((row) => row.id === withNotes.id);
    const emptyIndex = items.findIndex((row) => row.id === withoutNotes.id);
    expect(notedIndex).toBeGreaterThan(-1);
    expect(emptyIndex).toBeGreaterThan(-1);
    expect(notedIndex).toBeLessThan(emptyIndex);
  });
});
