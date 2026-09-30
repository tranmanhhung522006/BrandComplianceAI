import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import OpenAI, {
  toFile,
} from 'openai';

import {
  CampaignRole,
  ComplianceDocumentType,
} from '../generated/prisma/enums.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  StorageService,
} from '../storage/storage.service.js';

import {
  getComplianceDocumentExtension,
  hasValidComplianceDocumentSignature,
  MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES,
} from './compliance-document-upload.config.js';

@Injectable()
export class ComplianceDocumentsService {
  private readonly openai:
    OpenAI;

  constructor(
    private readonly prisma:
      PrismaService,

    private readonly storage:
      StorageService,
  ) {
    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is missing from .env',
      );
    }

    this.openai =
      new OpenAI({
        apiKey,
      });
  }

  private async assertCampaignAccess(
    campaignId: number,
    userId: number,
  ) {
    const campaign =
      await this.prisma.campaign.findUnique({
        where: {
          id:
            campaignId,
        },

        select: {
          id:
            true,

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
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

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
        'You do not have access to this campaign',
      );
    }

    return campaign;
  }

  private async assertCampaignAdmin(
    campaignId: number,
    userId: number,
  ) {
    const campaign =
      await this.prisma.campaign.findUnique({
        where: {
          id:
            campaignId,
        },

        select: {
          id:
            true,

          ownerId:
            true,

          members: {
            where: {
              userId,
            },

            select: {
              role:
                true,
            },
          },
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    const isOwner =
      campaign.ownerId ===
      userId;

    const membership =
      campaign.members[0];

    const isAdmin =
      membership?.role ===
      CampaignRole.ADMIN;

    if (
      !isOwner &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'Only campaign owner or Admin can manage compliance documents',
      );
    }

    return campaign;
  }

  private validateDocumentFile(
    file: Express.Multer.File,
  ) {
    if (
      !file.buffer ||
      file.buffer.length === 0
    ) {
      throw new BadRequestException(
        'Document file is empty',
      );
    }

    if (
      file.size >
      MAX_COMPLIANCE_DOCUMENT_SIZE_BYTES
    ) {
      throw new BadRequestException(
        'Compliance document must be 20 MB or smaller',
      );
    }

    const extension =
      getComplianceDocumentExtension(
        file.mimetype,
        file.originalname,
      );

    if (!extension) {
      throw new BadRequestException(
        'Only PDF, TXT, Markdown and DOCX compliance documents are supported',
      );
    }

    if (
      !hasValidComplianceDocumentSignature(
        file.mimetype,
        file.buffer,
      )
    ) {
      throw new BadRequestException(
        'Document content does not match its declared file type',
      );
    }

    return extension;
  }

  async findAll(
    campaignId: number,
    userId: number,
  ) {
    await this.assertCampaignAccess(
      campaignId,
      userId,
    );

    return this.prisma.complianceDocument.findMany({
      where: {
        campaignId,
      },

      include: {
        campaign:
          true,

        uploadedBy: {
          select: {
            id:
              true,

            email:
              true,

            name:
              true,
          },
        },
      },

      orderBy: [
        {
          documentType:
            'asc',
        },

        {
          createdAt:
            'desc',
        },
      ],
    });
  }

  async getActiveDocuments(
    campaignId: number,
  ) {
    return this.prisma.complianceDocument.findMany({
      where: {
        campaignId,

        isActive:
          true,
      },

      orderBy: {
        createdAt:
          'desc',
      },
    });
  }

  async uploadDocument(
    campaignId: number,
    title: string,
    documentType:
      ComplianceDocumentType,
    version: string,
    uploadedById: number,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Document file is required',
      );
    }

    if (!title?.trim()) {
      throw new BadRequestException(
        'title is required',
      );
    }

    if (!version?.trim()) {
      throw new BadRequestException(
        'version is required',
      );
    }

    const extension =
      this.validateDocumentFile(
        file,
      );

    await this.assertCampaignAdmin(
      campaignId,
      uploadedById,
    );

    const existingVersion =
      await this.prisma.complianceDocument.findFirst({
        where: {
          campaignId,

          documentType,

          version:
            version.trim(),
        },

        select: {
          id:
            true,
        },
      });

    if (existingVersion) {
      throw new BadRequestException(
        'This document version already exists for the campaign',
      );
    }

    const storageLocation =
      await this.storage.save({
        folder:
          'compliance-documents',

        buffer:
          file.buffer,

        extension,

        contentType:
          file.mimetype,
      });

    let openaiFileId:
      string | null = null;

    try {
      const uploadable =
        await toFile(
          file.buffer,
          file.originalname,
          {
            type:
              file.mimetype,
          },
        );

      const openaiFile =
        await this.openai.files.create({
          file:
            uploadable,

          purpose:
            'user_data',
        });

      openaiFileId =
        openaiFile.id;

      const document =
        await this.prisma.$transaction(
          async (tx) => {
            await tx.complianceDocument.updateMany({
              where: {
                campaignId,

                documentType,

                isActive:
                  true,
              },

              data: {
                isActive:
                  false,
              },
            });

            return tx.complianceDocument.create({
              data: {
                campaignId,

                title:
                  title.trim(),

                documentType,

                version:
                  version.trim(),

                fileName:
                  file.originalname,

                fileUrl:
                  storageLocation,

                mimeType:
                  file.mimetype,

                fileSize:
                  file.size,

                openaiFileId:
                  openaiFile.id,

                isActive:
                  true,

                uploadedById,
              },

              include: {
                campaign:
                  true,

                uploadedBy: {
                  select: {
                    id:
                      true,

                    email:
                      true,

                    name:
                      true,
                  },
                },
              },
            });
          },
        );

      return {
        message:
          'Compliance document uploaded successfully',

        document,
      };
    } catch (error) {
      await this.storage.delete(
        storageLocation,
      );

      if (openaiFileId) {
        try {
          await this.openai.files.delete(
            openaiFileId,
          );
        } catch {
          // Ignore cleanup failure.
        }
      }

      throw error;
    }
  }

  async activateDocument(
    documentId: number,
    userId: number,
  ) {
    const document =
      await this.prisma.complianceDocument.findUnique({
        where: {
          id:
            documentId,
        },

        select: {
          id:
            true,

          campaignId:
            true,

          documentType:
            true,
        },
      });

    if (!document) {
      throw new NotFoundException(
        `ComplianceDocument ${documentId} not found`,
      );
    }

    if (
      document.campaignId ===
      null
    ) {
      throw new BadRequestException(
        'Legacy compliance document is not assigned to a campaign',
      );
    }

    await this.assertCampaignAdmin(
      document.campaignId,
      userId,
    );

    const updated =
      await this.prisma.$transaction(
        async (tx) => {
          await tx.complianceDocument.updateMany({
            where: {
              campaignId:
                document.campaignId,

              documentType:
                document.documentType,

              isActive:
                true,
            },

            data: {
              isActive:
                false,
            },
          });

          return tx.complianceDocument.update({
            where: {
              id:
                documentId,
            },

            data: {
              isActive:
                true,
            },

            include: {
              campaign:
                true,

              uploadedBy: {
                select: {
                  id:
                    true,

                  email:
                    true,

                  name:
                    true,
                },
              },
            },
          });
        },
      );

    return {
      message:
        'Compliance document activated',

      document:
        updated,
    };
  }

  async deactivateDocument(
    documentId: number,
    userId: number,
  ) {
    const document =
      await this.prisma.complianceDocument.findUnique({
        where: {
          id:
            documentId,
        },

        select: {
          id:
            true,

          campaignId:
            true,
        },
      });

    if (!document) {
      throw new NotFoundException(
        `ComplianceDocument ${documentId} not found`,
      );
    }

    if (
      document.campaignId ===
      null
    ) {
      throw new BadRequestException(
        'Legacy compliance document is not assigned to a campaign',
      );
    }

    await this.assertCampaignAdmin(
      document.campaignId,
      userId,
    );

    const updated =
      await this.prisma.complianceDocument.update({
        where: {
          id:
            documentId,
        },

        data: {
          isActive:
            false,
        },

        include: {
          campaign:
            true,

          uploadedBy: {
            select: {
              id:
                true,

              email:
                true,

              name:
                true,
            },
          },
        },
      });

    return {
      message:
        'Compliance document deactivated',

      document:
        updated,
    };
  }
}