import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ReleasesService } from './releases.service.js';

@Controller('releases')
@UseGuards(AuthGuard)
export class ReleasesController {
  constructor(
    private readonly releasesService:
      ReleasesService,
  ) {}

  @Post('versions/:versionId')
  releaseVersion(
    @Param('versionId')
    versionId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: {
      note?: string;
    },
  ) {
    const versionIdNumber =
      Number(versionId);

    if (
      !Number.isInteger(
        versionIdNumber,
      ) ||
      versionIdNumber <= 0
    ) {
      throw new BadRequestException(
        'versionId must be a positive integer',
      );
    }

    return this.releasesService.releaseVersion(
      versionIdNumber,
      user.id,
      body.note,
    );
  }

  @Get('versions/:versionId')
  getRelease(
    @Param('versionId')
    versionId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const versionIdNumber =
      Number(versionId);

    if (
      !Number.isInteger(
        versionIdNumber,
      ) ||
      versionIdNumber <= 0
    ) {
      throw new BadRequestException(
        'versionId must be a positive integer',
      );
    }

    return this.releasesService.getRelease(
      versionIdNumber,
      user.id,
    );
  }

  @Get('notifications')
  getNotifications(
    @CurrentUser()
    user: AuthenticatedUser,

    @Query('campaignId')
    campaignId?: string,
  ) {
    if (
      campaignId === undefined ||
      campaignId === ''
    ) {
      return this.releasesService.getNotifications(
        user.id,
      );
    }

    const campaignIdNumber =
      Number(campaignId);

    if (
      !Number.isInteger(
        campaignIdNumber,
      ) ||
      campaignIdNumber <= 0
    ) {
      throw new BadRequestException(
        'campaignId must be a positive integer',
      );
    }

    return this.releasesService.getNotifications(
      user.id,
      campaignIdNumber,
    );
  }

  @Patch('notifications/:notificationId/read')
  markNotificationRead(
    @Param('notificationId')
    notificationId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const notificationIdNumber =
      Number(notificationId);

    if (
      !Number.isInteger(
        notificationIdNumber,
      ) ||
      notificationIdNumber <= 0
    ) {
      throw new BadRequestException(
        'notificationId must be a positive integer',
      );
    }

    return this.releasesService.markNotificationRead(
      notificationIdNumber,
      user.id,
    );
  }
}