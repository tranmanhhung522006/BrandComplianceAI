import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  CampaignsService,
} from './campaigns.service.js';

@Controller('campaigns')
@UseGuards(AuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService:
      CampaignsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,

    @Query('archived')
    archived?: string,
  ) {
    const archivedFilter =
      archived === 'all'
        ? null
        : archived === 'true';

    return this.campaignsService.findAll(
      user.id,
      archivedFilter,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: {
      name: string;
      description?: string;
      deadline?: string | null;
    },
  ) {
    return this.campaignsService.create(
      body.name,
      user.id,
      body.description,
      body.deadline,
    );
  }

  @Patch(':campaignId')
  updateCampaign(
    @Param('campaignId')
    campaignId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: {
      name?: string;
      description?: string | null;
      deadline?: string | null;
    },
  ) {
    return this.campaignsService.updateCampaign(
      Number(campaignId),
      user.id,
      body,
    );
  }


  @Patch(':campaignId/archive')
  archiveCampaign(
    @Param('campaignId')
    campaignId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.campaignsService.archiveCampaign(
      Number(
        campaignId,
      ),
      user.id,
    );
  }

  @Patch(':campaignId/restore')
  restoreCampaign(
    @Param('campaignId')
    campaignId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.campaignsService.restoreCampaign(
      Number(
        campaignId,
      ),
      user.id,
    );
  }

  @Get(':campaignId/members')
  getMembers(
    @Param('campaignId')
    campaignId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.campaignsService.getMembers(
      Number(
        campaignId,
      ),
      user.id,
    );
  }

  @Post(':campaignId/members')
  addMember(
    @Param('campaignId')
    campaignId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: {
      email: string;
      role: string;
    },
  ) {
    return this.campaignsService.addMember(
      Number(
        campaignId,
      ),
      user.id,
      body.email,
      body.role,
    );
  }

  @Patch(
    ':campaignId/members/:memberId',
  )
  updateMemberRole(
    @Param('campaignId')
    campaignId: string,

    @Param('memberId')
    memberId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: {
      role: string;
    },
  ) {
    return this.campaignsService.updateMemberRole(
      Number(
        campaignId,
      ),
      Number(
        memberId,
      ),
      user.id,
      body.role,
    );
  }

  @Delete(
    ':campaignId/members/:memberId',
  )
  removeMember(
    @Param('campaignId')
    campaignId: string,

    @Param('memberId')
    memberId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.campaignsService.removeMember(
      Number(
        campaignId,
      ),
      Number(
        memberId,
      ),
      user.id,
    );
  }
}
