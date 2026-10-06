import { describe, expect, it } from 'vitest';
import { applyClassificationPolicy } from '../src/requests/classification-policy';
import { parseClassifyBody } from '../src/requests/classify.dto';
import { KeywordClassifier } from '../src/requests/keyword-classifier';
import { BadRequestException } from '@nestjs/common';

describe('KeywordClassifier', () => {
  const classifier = new KeywordClassifier();

  it('classifies billing messages', () => {
    const result = classifier.classify('Please fix my invoice and payment charge');
    expect(result.category).toBe('billing');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns unknown for unrelated text', () => {
    const result = classifier.classify('Hello there');
    expect(result.category).toBe('unknown');
  });
});

describe('applyClassificationPolicy', () => {
  const classifier = new KeywordClassifier();

  it('softens confidence for short non-unknown messages', () => {
    const raw = classifier.classify('invoice overdue');
    const result = applyClassificationPolicy('invoice overdue', raw);
    expect(result.category).toBe('billing');
    expect(result.confidence).toBe(Math.max(0.5, raw.confidence - 0.15));
  });

  it('maps weak confidence to unknown', () => {
    const result = applyClassificationPolicy('Hello there', {
      category: 'unknown',
      confidence: 0.4,
    });
    expect(result).toEqual({ category: 'unknown', confidence: 0.4 });
  });

  it('leaves strong longer messages unchanged', () => {
    const raw = classifier.classify('Please fix my invoice and payment charge');
    expect(applyClassificationPolicy('Please fix my invoice and payment charge', raw)).toEqual(
      raw,
    );
  });
});

describe('parseClassifyBody', () => {
  it('rejects empty messages', () => {
    expect(() => parseClassifyBody({ message: '   ' })).toThrow(BadRequestException);
  });

  it('rejects oversized messages', () => {
    expect(() => parseClassifyBody({ message: 'x'.repeat(2001) })).toThrow(BadRequestException);
  });

  it('trims a valid message', () => {
    expect(parseClassifyBody({ message: '  need a refund  ', requestId: 'abc' })).toEqual({
      message: 'need a refund',
      requestId: 'abc',
    });
  });
});
