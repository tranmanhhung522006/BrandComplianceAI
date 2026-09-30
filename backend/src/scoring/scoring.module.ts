import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  AiModule,
} from '../ai/ai.module.js';

import {
  AuditModule,
} from '../audit/audit.module.js';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  ScoringController,
} from './scoring.controller.js';

import {
  ScoringService,
} from './scoring.service.js';

import {
  ScoringWorker,
} from './scoring.worker.js';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    AuditModule,
    AuthModule,
  ],

  controllers: [
    ScoringController,
  ],

  providers: [
    ScoringService,
    ScoringWorker,
  ],

  exports: [
    ScoringService,
  ],
})
export class ScoringModule {}