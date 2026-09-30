import {
  BadRequestException,
  Controller,
  Get,
  Param,
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
  AuditService,
} from './audit.service.js';

@Controller('audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(
    private readonly auditService:
      AuditService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.auditService.findAll(
      user.id,
    );
  }

  @Get(':entityType/:entityId')
  findByEntity(
    @Param('entityType')
    entityType: string,

    @Param('entityId')
    entityId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const id =
      Number(entityId);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw new BadRequestException(
        'entityId must be a positive integer',
      );
    }

    return this.auditService.findByEntity(
      entityType,
      id,
      user.id,
    );
  }
}