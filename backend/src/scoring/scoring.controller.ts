import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  AuthGuard,
} from '../auth/auth.guard.js';

import {
  CurrentUser,
} from '../auth/current-user.decorator.js';

import type {
  AuthenticatedUser,
} from '../auth/auth.types.js';

import {
  ScoringService,
} from './scoring.service.js';

@Controller('scoring')
@UseGuards(AuthGuard)
export class ScoringController {
  constructor(
    private readonly scoringService:
      ScoringService,
  ) {}

  @Post(':versionId/start')
  startScoring(
    @Param('versionId')
    versionId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const id =
      Number(versionId);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        'versionId must be a positive integer',
      );
    }

    return this.scoringService.startScoring(
      id,
      user.id,
    );
  }

  @Post('jobs/:jobId/retry')
  retryJob(
    @Param('jobId')
    jobId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const id =
      Number(jobId);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        'jobId must be a positive integer',
      );
    }

    return this.scoringService.retryJob(
      id,
      user.id,
    );
  }

  @Get('versions/:versionId')
  getVersionScoring(
    @Param('versionId')
    versionId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const id =
      Number(versionId);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        'versionId must be a positive integer',
      );
    }

    return this.scoringService.getVersionScoring(
      id,
      user.id,
    );
  }
}