import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CampaignRole,
} from '../generated/prisma/enums.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  AuditService,
} from '../audit/audit.service.js';

import {
  ScoringService,
} from '../scoring/scoring.service.js';

import {
  StorageService,
} from '../storage/storage.service.js';

import {
  ALLOWED_ASSET_MIME_TYPES,
  getAssetFileExtension,
  hasValidAssetFileSignature,
  MAX_ASSET_FILE_SIZE_BYTES,
} from './asset-upload.config.js';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly audit:
      AuditService,

    private readonly scoringService:
      ScoringService,

    private readonly storage:
      StorageService,
  ) {}

  async findAll(
    userId: number,
  ) {
    const campaigns =
      await this.prisma.campaign.findMany({
        where: {
          OR: [
            {
              ownerId:
                userId,
            },

            {
              members: {
                some: {
                  userId,
                },
              },
            },
          ],
        },

        select: {
          id:
            true,
        },
      });

    const campaignIds =
      campaigns.map(
        (campaign) =>
          campaign.id,
      );

    if (
      campaignIds.length ===
      0
    ) {
      return [];
    }

    return this.prisma.asset.findMany({
      where: {
        campaignId: {
          in:
            campaignIds,
        },
      },

      include: {
        campaign:
          true,

        createdBy: {
          select: {
            id:
              true,

            email:
              true,

            name:
              true,
          },
        },

        versions: {
          orderBy: {
            versionNumber:
              'asc',
          },
        },
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });
  }

  async create(
    name: string,
    campaignId: number,
    createdById: number,
    description?: string,
  ) {
    if (
      !name?.trim()
    ) {
      throw new BadRequestException(
        'Asset name is required',
      );
    }

    if (
      !Number.isInteger(
        campaignId,
      ) ||
      campaignId <= 0
    ) {
      throw new BadRequestException(
        'campaignId must be a positive integer',
      );
    }

    const campaign =
      await this.prisma.campaign.findUnique({
        where: {
          id:
            campaignId,
        },

        include: {
          members:
            true,
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    const membership =
      campaign.members.find(
        (member) =>
          member.userId ===
          createdById,
      );

    const isOwner =
      campaign.ownerId ===
      createdById;

    const isMaker =
      membership?.role ===
      CampaignRole.MAKER;

    if (
      !isOwner &&
      !isMaker
    ) {
      throw new ForbiddenException(
        'Only campaign owner or Maker can create assets',
      );
    }

    return this.prisma.asset.create({
      data: {
        name:
          name.trim(),

        description,

        campaignId,

        createdById,
      },
    });
  }

  async getVersionFile(
    versionId: number,
    userId: number,
  ) {
    if (
      !Number.isInteger(
        versionId,
      ) ||
      versionId <= 0
    ) {
      throw new BadRequestException(
        'versionId must be a positive integer',
      );
    }

    const version =
      await this.prisma.assetVersion.findUnique({
        where: {
          id:
            versionId,
        },

        select: {
          id:
            true,

          fileName:
            true,

          fileUrl:
            true,

          mimeType:
            true,

          fileSize:
            true,

          asset: {
            select: {
              campaign: {
                select: {
                  ownerId:
                    true,

                  members: {
                    where: {
                      userId,
                    },

                    select: {
                      id:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!version) {
      throw new NotFoundException(
        'Asset version not found',
      );
    }

    const campaign =
      version.asset.campaign;

    const isOwner =
      campaign.ownerId ===
      userId;

    const isMember =
      campaign.members.length >
      0;

    if (
      !isOwner &&
      !isMember
    ) {
      throw new ForbiddenException(
        'You do not have access to this asset version',
      );
    }

    const buffer =
      await this.storage.read(
        version.fileUrl,
      );

    if (
      !buffer ||
      buffer.length === 0
    ) {
      throw new NotFoundException(
        'Stored asset file is empty or unavailable',
      );
    }

    return {
      buffer,

      fileName:
        version.fileName,

      mimeType:
        version.mimeType ??
        'application/octet-stream',

      fileSize:
        version.fileSize ??
        buffer.length,
    };
  }

  private validateUploadedFile(
    file: Express.Multer.File,
  ) {
    if (
      !file.buffer ||
      file.buffer.length ===
        0
    ) {
      throw new BadRequestException(
        'Uploaded file is empty',
      );
    }

    if (
      file.size >
      MAX_ASSET_FILE_SIZE_BYTES
    ) {
      throw new BadRequestException(
        'File size must be 10 MB or smaller',
      );
    }

    if (
      !ALLOWED_ASSET_MIME_TYPES.has(
        file.mimetype,
      )
    ) {
      throw new BadRequestException(
        'Only PNG, JPEG, WEBP, GIF and PDF files are supported',
      );
    }

    if (
      !hasValidAssetFileSignature(
        file.mimetype,
        file.buffer,
      )
    ) {
      throw new BadRequestException(
        'File content does not match its declared file type',
      );
    }
  }

  private isUniqueConstraintError(
    error: unknown,
  ) {
    if (
      typeof error !==
        'object' ||
      error === null ||
      !(
        'code' in error
      )
    ) {
      return false;
    }

    return (
      (
        error as {
          code?: unknown;
        }
      ).code ===
      'P2002'
    );
  }

  private async createVersionRecord(
    assetId: number,
    uploadedById: number,
    file: Express.Multer.File,
    storageLocation: string,
  ) {
    const maxAttempts =
      5;

    for (
      let attempt =
        1;
      attempt <=
      maxAttempts;
      attempt +=
        1
    ) {
      const latestVersion =
        await this.prisma.assetVersion.findFirst({
          where: {
            assetId,
          },

          select: {
            versionNumber:
              true,
          },

          orderBy: {
            versionNumber:
              'desc',
          },
        });

      const nextVersionNumber =
        latestVersion
          ? latestVersion.versionNumber +
            1
          : 1;

      try {
        return await this.prisma.assetVersion.create({
          data: {
            assetId,

            uploadedById,

            versionNumber:
              nextVersionNumber,

            fileName:
              file.originalname,

            fileUrl:
              storageLocation,

            mimeType:
              file.mimetype,

            fileSize:
              file.size,

            status:
              'DRAFT',
          },
        });
      } catch (error) {
        const canRetry =
          this.isUniqueConstraintError(
            error,
          );

        if (
          !canRetry ||
          attempt ===
            maxAttempts
        ) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Unable to allocate the next asset version number',
    );
  }

  async createVersion(
    assetId: number,
    uploadedById: number,
    file: Express.Multer.File,
  ) {
    if (
      !Number.isInteger(
        assetId,
      ) ||
      assetId <= 0
    ) {
      throw new BadRequestException(
        'assetId must be a positive integer',
      );
    }

    this.validateUploadedFile(
      file,
    );

    const asset =
      await this.prisma.asset.findUnique({
        where: {
          id:
            assetId,
        },

        include: {
          campaign: {
            include: {
              members:
                true,
            },
          },
        },
      });

    if (!asset) {
      throw new NotFoundException(
        'Asset not found',
      );
    }

    const membership =
      asset.campaign.members.find(
        (member) =>
          member.userId ===
          uploadedById,
      );

    const isOwner =
      asset.campaign.ownerId ===
      uploadedById;

    const isMaker =
      membership?.role ===
      CampaignRole.MAKER;

    if (
      !isOwner &&
      !isMaker
    ) {
      throw new ForbiddenException(
        'Only campaign owner or Maker can upload asset versions',
      );
    }

    const extension =
      getAssetFileExtension(
        file.mimetype,
      );

    if (!extension) {
      throw new BadRequestException(
        'Unsupported file type',
      );
    }

    const storageLocation =
      await this.storage.save({
        folder:
          'assets',

        buffer:
          file.buffer,

        extension,

        contentType:
          file.mimetype,
      });

    let version;

    try {
      version =
        await this.createVersionRecord(
          assetId,
          uploadedById,
          file,
          storageLocation,
        );
    } catch (error) {
      await this.storage.delete(
        storageLocation,
      );

      if (
        this.isUniqueConstraintError(
          error,
        )
      ) {
        throw new ConflictException(
          'Too many simultaneous uploads. Please try again.',
        );
      }

      throw error;
    }

    await this.audit.log(
      'UPLOAD_VERSION',
      'AssetVersion',
      version.id,
      uploadedById,
      {
        assetId:
          version.assetId,

        assetVersionId:
          version.id,

        versionNumber:
          version.versionNumber,

        fileName:
          version.fileName,

        mimeType:
          version.mimeType,

        fileSize:
          version.fileSize,

        storageLocation:
          version.fileUrl,
      },
    );

    const scoring =
      await this.scoringService.startScoring(
        version.id,
      );

    return {
      message:
        'Asset version uploaded and scoring queued',

      version:
        scoring.version,

      scoringJob:
        scoring.job,
    };
  }
}