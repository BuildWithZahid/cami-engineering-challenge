import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CLASSIFIER } from './classifier';
import { ClassificationEvent } from './classification-event.entity';
import { CustomerRequest } from './customer-request.entity';
import { KeywordClassifier } from './keyword-classifier';
import { LlmClassifier } from './llm-classifier';
import { RequestNote } from './request-note.entity';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequest, RequestNote, ClassificationEvent])],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    KeywordClassifier,
    LlmClassifier,
    // Bound implementation. To use the LLM placeholder instead:
    //   { provide: CLASSIFIER, useExisting: LlmClassifier },
    { provide: CLASSIFIER, useExisting: KeywordClassifier },
  ],
})
export class RequestsModule {}
