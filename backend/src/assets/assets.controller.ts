import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  StreamableFile,
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

import type {
  Response,
} from 'express';

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
  ALLOWED_ASSET_MIME_TYPES,
  MAX_ASSET_FILE_SIZE_BYTES,
} from './asset-upload.config.js';

import {
  AssetsService,
} from './assets.service.js';

@Controller('assets')
@UseGuards(AuthGuard)
export class AssetsController {
  constructor(
    private readonly assetsService:
      AssetsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.assetsService.findAll(
      user.id,
    );
  }

  @Get('versions/:versionId/file')
  async getVersionFile(
    @Param('versionId')
    versionId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Res({
      passthrough:
        true,
    })
    response: Response,
  ) {
    const numericVersionId =
      Number(
        versionId,
      );

    if (
      !Number.isInteger(
        numericVersionId,
      ) ||
      numericVersionId <= 0
    ) {
      throw new BadRequestException(
        'Version id must be a positive integer',
      );
    }

    const result =
      await this.assetsService.getVersionFile(
        numericVersionId,
        user.id,
      );

    response.setHeader(
      'Content-Type',
      result.mimeType,
    );

    response.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(
        result.fileName,
      )}`,
    );

    response.setHeader(
      'Content-Length',
      String(
        result.buffer.length,
      ),
    );

    response.setHeader(
      'X-Content-Type-Options',
      'nosniff',
    );

    return new StreamableFile(
      result.buffer,
    );
  }

  @Post()
  create(
    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: {
      name: string;
      campaignId: number;
      description?: string;
    },
  ) {
    return this.assetsService.create(
      body.name,
      body.campaignId,
      user.id,
      body.description,
    );
  }

  @Post(':id/versions')
  @UseInterceptors(
    FileInterceptor('file', {
      storage:
        memoryStorage(),

      limits: {
        files:
          1,

        fileSize:
          MAX_ASSET_FILE_SIZE_BYTES,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        if (
          !ALLOWED_ASSET_MIME_TYPES.has(
            file.mimetype,
          )
        ) {
          callback(
            new BadRequestException(
              'Only PNG, JPEG, WEBP, GIF and PDF files are supported',
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
    }),
  )
  uploadVersion(
    @Param('id')
    id: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @UploadedFile()
    file: Express.Multer.File,
  ) {
    const assetId =
      Number(
        id,
      );

    if (
      !Number.isInteger(
        assetId,
      ) ||
      assetId <= 0
    ) {
      throw new BadRequestException(
        'Asset id must be a positive integer',
      );
    }

    if (!file) {
      throw new BadRequestException(
        'File not received. form-data key must be "file"',
      );
    }

    return this.assetsService.createVersion(
      assetId,
      user.id,
      file,
    );
  }
}