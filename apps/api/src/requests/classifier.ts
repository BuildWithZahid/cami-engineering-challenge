export const CLASSIFICATION_CATEGORIES = ['billing', 'sales', 'support', 'unknown'] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

export type ClassificationResult = {
  category: ClassificationCategory;
  confidence: number;
};

export const CLASSIFIER = 'CLASSIFIER';

/**
 * Scoring provider. KeywordClassifier is the current implementation;
 * an LLM adapter would implement the same contract (timeouts/failures
 * belong in that adapter, not in RequestsService).
 */
export interface Classifier {
  readonly id: string;
  classify(message: string): ClassificationResult | Promise<ClassificationResult>;
}

export function isClassificationCategory(value: string): value is ClassificationCategory {
  return (CLASSIFICATION_CATEGORIES as readonly string[]).includes(value);
}
