import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { applyClassificationPolicy } from './classification-policy';
import { ClassificationEvent } from './classification-event.entity';
import { CLASSIFIER, Classifier, isClassificationCategory } from './classifier';
import { ClassifyInput, ClassifyResponse } from './classify.dto';
import { CustomerRequest, RequestStatus } from './customer-request.entity';

export type RequestListItem = {
  id: string;
  message: string;
  status: RequestStatus;
  category: string | null;
  confidence: number | null;
  noteCount: number;
  latestNotePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HistoryItem = {
  id: string;
  requestId: string | null;
  message: string;
  category: string;
  confidence: number;
  provider: string;
  createdAt: string;
};

const HISTORY_LIMIT = 100;

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(CustomerRequest)
    private readonly requests: Repository<CustomerRequest>,
    @InjectRepository(ClassificationEvent)
    private readonly events: Repository<ClassificationEvent>,
    @Inject(CLASSIFIER) private readonly classifier: Classifier,
  ) {}

  async list(): Promise<RequestListItem[]> {
    // One query for the list: count notes and pick the latest preview in SQL
    // instead of loading every note per request (N+1 under seed load).
    const rows: Array<{
      id: string;
      message: string;
      status: RequestStatus;
      category: string | null;
      confidence: number | string | null;
      noteCount: number | string;
      latestNotePreview: string | null;
      createdAt: Date | string;
      updatedAt: Date | string;
    }> = await this.requests.query(`
      SELECT
        request.id,
        request.message,
        request.status,
        request.category,
        request.confidence,
        request.created_at AS "createdAt",
        request.updated_at AS "updatedAt",
        COALESCE(note_count.total, 0)::int AS "noteCount",
        latest_note.body AS "latestNotePreview"
      FROM customer_requests request
      LEFT JOIN (
        SELECT request_id, COUNT(*)::int AS total
        FROM request_notes
        GROUP BY request_id
      ) note_count ON note_count.request_id = request.id
      LEFT JOIN (
        SELECT DISTINCT ON (request_id)
          request_id,
          body
        FROM request_notes
        ORDER BY request_id, created_at DESC, id DESC
      ) latest_note ON latest_note.request_id = request.id
      ORDER BY request.created_at DESC
    `);

    return rows.map((row) => ({
      id: row.id,
      message: row.message,
      status: row.status,
      category: row.category,
      confidence: row.confidence == null ? null : Number(row.confidence),
      noteCount: Number(row.noteCount),
      latestNotePreview: row.latestNotePreview,
      createdAt: toIso(row.createdAt),
      updatedAt: toIso(row.updatedAt),
    }));
  }

  async getById(id: string): Promise<CustomerRequest> {
    const row = await this.requests.findOne({
      where: { id },
      relations: { notes: true },
    });
    if (!row) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    return row;
  }

  async updateStatus(id: string, status: RequestStatus): Promise<CustomerRequest> {
    const row = await this.getById(id);
    row.status = status;
    return this.requests.save(row);
  }

  async create(message: string): Promise<CustomerRequest> {
    const row = this.requests.create({
      message,
      status: 'open',
      category: null,
      confidence: null,
    });
    return this.requests.save(row);
  }

  async classify(input: ClassifyInput): Promise<ClassifyResponse> {
    const result = applyClassificationPolicy(
      input.message,
      await this.classifier.classify(input.message),
    );

    if (input.requestId) {
      const existing = await this.getById(input.requestId);
      existing.category = result.category;
      existing.confidence = result.confidence;
      if (existing.status === 'open') {
        existing.status = 'in_progress';
      }
      await this.requests.save(existing);
    }

    await this.events.save(
      this.events.create({
        requestId: input.requestId ?? null,
        message: input.message,
        category: result.category,
        confidence: result.confidence,
        provider: this.classifier.id,
      }),
    );

    return {
      category: result.category,
      confidence: result.confidence,
      requestId: input.requestId ?? null,
    };
  }

  async listHistory(category?: string): Promise<{ items: HistoryItem[] }> {
    const qb = this.events
      .createQueryBuilder('event')
      .orderBy('event.createdAt', 'DESC')
      .take(HISTORY_LIMIT);

    if (category && isClassificationCategory(category)) {
      qb.andWhere('event.category = :category', { category });
    }

    const rows = await qb.getMany();
    return {
      items: rows.map((row) => ({
        id: row.id,
        requestId: row.requestId,
        message: row.message,
        category: row.category,
        confidence: row.confidence,
        provider: row.provider,
        createdAt: toIso(row.createdAt),
      })),
    };
  }
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
