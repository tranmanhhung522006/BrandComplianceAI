import { Module } from '@nestjs/common';

import {
  AssetsController,
} from './assets.controller.js';

import {
  AssetsService,
} from './assets.service.js';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  AuditModule,
} from '../audit/audit.module.js';

import {
  ScoringModule,
} from '../scoring/scoring.module.js';

import {
  AuthModule,
} from '../auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    ScoringModule,
    AuthModule,
  ],

  controllers: [
    AssetsController,
  ],

  providers: [
    AssetsService,
  ],

  exports: [
    AssetsService,
  ],
})
export class AssetsModule {}