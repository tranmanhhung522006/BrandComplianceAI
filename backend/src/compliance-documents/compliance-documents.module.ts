import {
  Module,
} from '@nestjs/common';

import {
  AuthModule,
} from '../auth/auth.module.js';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  ComplianceDocumentsController,
} from './compliance-documents.controller.js';

import {
  ComplianceDocumentsService,
} from './compliance-documents.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    ComplianceDocumentsController,
  ],

  providers: [
    ComplianceDocumentsService,
  ],

  exports: [
    ComplianceDocumentsService,
  ],
})
export class ComplianceDocumentsModule {}