import { Injectable } from '@nestjs/common';
import { ClassificationResult, Classifier } from './classifier';

/** Empty LLM adapter. Implement classify() later; swap it in via RequestsModule. */
@Injectable()
export class LlmClassifier implements Classifier {
  readonly id = 'llm';

  classify(_message: string): ClassificationResult {
    return { category: 'unknown', confidence: 0 };
  }
}
