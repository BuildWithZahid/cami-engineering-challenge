import { ClassificationResult } from './classifier';

const SHORT_MESSAGE_WORD_LIMIT = 3;
const SHORT_MESSAGE_CONFIDENCE_PENALTY = 0.15;
const MIN_SHORT_MESSAGE_CONFIDENCE = 0.5;
const WEAK_CONFIDENCE_THRESHOLD = 0.55;

/**
 * Post-process a raw classifier score. Kept separate from the keyword matcher
 * so the HTTP layer does not own these rules.
 */
export function applyClassificationPolicy(
  message: string,
  raw: ClassificationResult,
): ClassificationResult {
  let result = raw;

  if (message.split(/\s+/).length < SHORT_MESSAGE_WORD_LIMIT && result.category !== 'unknown') {
    result = {
      category: result.category,
      confidence: Math.max(
        MIN_SHORT_MESSAGE_CONFIDENCE,
        result.confidence - SHORT_MESSAGE_CONFIDENCE_PENALTY,
      ),
    };
  }

  if (result.confidence < WEAK_CONFIDENCE_THRESHOLD) {
    return { category: 'unknown', confidence: result.confidence };
  }

  return result;
}
