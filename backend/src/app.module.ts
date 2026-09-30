import {
  Module,
} from '@nestjs/common';

import {
  ScheduleModule,
} from '@nestjs/schedule';

import {
  AiModule,
} from './ai/ai.module.js';

import {
  AppController,
} from './app.controller.js';

import {
  AppService,
} from './app.service.js';

import {
  AssetsModule,
} from './assets/assets.module.js';

import {
  AuditModule,
} from './audit/audit.module.js';

import {
  AuthModule,
} from './auth/auth.module.js';

import {
  CampaignsModule,
} from './campaigns/campaigns.module.js';

import {
  ComplianceDocumentsModule,
} from './compliance-documents/compliance-documents.module.js';

import {
  PrismaModule,
} from './prisma/prisma.module.js';

import {
  ReleasesModule,
} from './releases/releases.module.js';

import {
  ReviewsModule,
} from './reviews/reviews.module.js';

import {
  ScoringModule,
} from './scoring/scoring.module.js';

import {
  StorageModule,
} from './storage/storage.module.js';

import {
  UsersModule,
} from './users/users.module.js';

import {
  WordPressAuthModule,
} from './wordpress-auth/wordpress-auth.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),

    PrismaModule,
    StorageModule,
    AuthModule,
    WordPressAuthModule,
    UsersModule,
    CampaignsModule,
    AssetsModule,
    AiModule,
    ScoringModule,
    ReviewsModule,
    ReleasesModule,
    AuditModule,
    ComplianceDocumentsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}