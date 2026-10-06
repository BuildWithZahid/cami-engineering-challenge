import { BadRequestException } from '@nestjs/common';
import { ClassificationCategory } from './keyword-classifier';

export type ClassifyRequestBody = {
  message?: unknown;
  requestId?: unknown;
};

export type ClassifyInput = {
  message: string;
  requestId?: string;
};

export type ClassifyResponse = {
  category: ClassificationCategory;
  confidence: number;
  requestId: string | null;
};

export function parseClassifyBody(body: ClassifyRequestBody): ClassifyInput {
  const message = body?.message;
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new BadRequestException('message must be a non-empty string');
  }
  if (message.length > 2000) {
    throw new BadRequestException('message too long');
  }

  const requestId = body.requestId;
  if (requestId != null && typeof requestId !== 'string') {
    throw new BadRequestException('requestId must be a string');
  }

  return {
    message: message.trim(),
    requestId: requestId || undefined,
  };
}
