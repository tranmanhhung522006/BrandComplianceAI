import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import {
  memoryStorage,
} from 'multer';

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
  ComplianceDocumentType,
} from '../generated/prisma/enums.js';

import {
  isAllowedComplianceDocument,
  MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES,
} from './compliance-document-upload.config.js';

import {
  ComplianceDocumentsService,
} from './compliance-documents.service.js';

@Controller('compliance-documents')
@UseGuards(AuthGuard)
export class ComplianceDocumentsController {
  constructor(
    private readonly service:
      ComplianceDocumentsService,
  ) {}

  @Get()
  findAll(
    @Query('campaignId')
    campaignId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const campaignIdNumber =
      Number(
        campaignId,
      );

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

    return this.service.findAll(
      campaignIdNumber,
      user.id,
    );
  }

  @Post()
  @UseInterceptors(
    FileInterceptor(
      'file',
      {
        storage:
          memoryStorage(),

        limits: {
          files:
            1,

          fileSize:
            MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES,
        },

        fileFilter: (
          _request,
          file,
          callback,
        ) => {
          if (
            !isAllowedComplianceDocument(
              file.mimetype,
              file.originalname,
            )
          ) {
            callback(
              new BadRequestException(
                'Only PDF, TXT, Markdown and DOCX compliance documents are supported',
              ),
              false,
            );

            return;
          }

          callback(
            null,
            true,
          );
        },
      },
    ),
  )
  uploadDocument(
    @CurrentUser()
    user: AuthenticatedUser,

    @Body('campaignId')
    campaignId: string,

    @Body('title')
    title: string,

    @Body('documentType')
    documentType: string,

    @Body('version')
    version: string,

    @UploadedFile()
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'file is required',
      );
    }

    const campaignIdNumber =
      Number(
        campaignId,
      );

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

    const allowedTypes =
      Object.values(
        ComplianceDocumentType,
      );

    if (
      !allowedTypes.includes(
        documentType as
          ComplianceDocumentType,
      )
    ) {
      throw new BadRequestException(
        `documentType must be one of: ${allowedTypes.join(', ')}`,
      );
    }

    return this.service.uploadDocument(
      campaignIdNumber,
      title,
      documentType as
        ComplianceDocumentType,
      version,
      user.id,
      file,
    );
  }

  @Patch(':id/activate')
  activateDocument(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const documentId =
      Number(
        id,
      );

    if (
      !Number.isInteger(
        documentId,
      ) ||
      documentId <= 0
    ) {
      throw new BadRequestException(
        'Document id must be a positive integer',
      );
    }

    return this.service.activateDocument(
      documentId,
      user.id,
    );
  }

  @Patch(':id/deactivate')
  deactivateDocument(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    const documentId =
      Number(
        id,
      );

    if (
      !Number.isInteger(
        documentId,
      ) ||
      documentId <= 0
    ) {
      throw new BadRequestException(
        'Document id must be a positive integer',
      );
    }

    return this.service.deactivateDocument(
      documentId,
      user.id,
    );
  }
}