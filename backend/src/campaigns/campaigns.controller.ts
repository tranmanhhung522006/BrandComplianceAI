import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
  ) {
    return this.campaignsService.findAll(
      user.id,
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
