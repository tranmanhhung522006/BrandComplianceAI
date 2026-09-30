import {
  Module,
} from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  ComplianceDocumentsModule,
} from '../compliance-documents/compliance-documents.module.js';

import {
  AiService,
} from './ai.service.js';

import {
  LlmGatewayService,
} from './llm-gateway.service.js';

@Module({
  imports: [
    PrismaModule,
    ComplianceDocumentsModule,
  ],

  providers: [
    AiService,
    LlmGatewayService,
  ],

  exports: [
    AiService,
  ],
})
export class AiModule {}