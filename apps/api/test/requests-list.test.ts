import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { createDataSource } from '../src/data-source';
import { CustomerRequest } from '../src/requests/customer-request.entity';
import { ClassificationEvent } from '../src/requests/classification-event.entity';
import { KeywordClassifier } from '../src/requests/keyword-classifier';
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
    service = new RequestsService(
      ds.getRepository(CustomerRequest),
      ds.getRepository(ClassificationEvent),
      new KeywordClassifier(),
    );
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await ds.query('DELETE FROM classification_events WHERE request_id = ANY($1::uuid[])', [
        createdIds,
      ]);
      await ds.query('DELETE FROM customer_requests WHERE id = ANY($1::uuid[])', [
        createdIds,
      ]);
    }
    await ds.query('DELETE FROM classification_events WHERE message LIKE $1', [`${PREFIX}%`]);
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

  it('classify persists category and moves open requests to in_progress', async () => {
    const [row] = await ds.query<{ id: string }[]>(
      `INSERT INTO customer_requests (message, status, created_at, updated_at)
       VALUES ($1, 'open', now(), now())
       RETURNING id`,
      [`${PREFIX} classify me`],
    );
    createdIds.push(row.id);

    const result = await service.classify({
      message: 'Please fix my invoice and payment charge',
      requestId: row.id,
    });
    expect(result).toMatchObject({
      category: 'billing',
      requestId: row.id,
    });

    const stored = await service.getById(row.id);
    expect(stored.status).toBe('in_progress');
    expect(stored.category).toBe('billing');
    expect(stored.confidence).toBeGreaterThan(0.5);

    const history = await service.listHistory();
    const recorded = history.items.find((item) => item.requestId === row.id);
    expect(recorded).toMatchObject({
      category: 'billing',
      provider: 'keyword',
      message: 'Please fix my invoice and payment charge',
    });
  });

  it('filters classification history by category', async () => {
    const result = await service.classify({
      message: `${PREFIX} sales pricing demo for next quarter`,
    });
    expect(result.category).toBe('sales');

    const sales = await service.listHistory('sales');
    expect(sales.items.length).toBeGreaterThan(0);
    expect(sales.items.every((item) => item.category === 'sales')).toBe(true);

    const billing = await service.listHistory('billing');
    expect(billing.items.every((item) => item.category === 'billing')).toBe(true);
  });
});
