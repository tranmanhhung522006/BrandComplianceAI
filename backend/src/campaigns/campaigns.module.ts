import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CampaignsController } from './campaigns.controller.js';
import { CampaignsService } from './campaigns.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    CampaignsController,
  ],

  providers: [
    CampaignsService,
  ],
})
export class CampaignsModule {}