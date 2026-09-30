import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

type AuditScope = {
  campaignIds: number[];
  campaignMemberIds: number[];
  assetIds: number[];
  assetVersionIds: number[];
  scoringJobIds: number[];
  complianceDocumentIds: number[];
  reviewIds: number[];
  releaseIds: number[];
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  log(
    action: string,
    entityType: string,
    entityId?: number,
    userId?: number,
    details?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,

        entityType,

        entityId,

        userId,

        details:
          details
            ? JSON.stringify(details)
            : null,
      },
    });
  }

  private async getScope(
    userId: number,
  ): Promise<AuditScope> {
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
      campaignIds.length === 0
    ) {
      return {
        campaignIds: [],
        campaignMemberIds: [],
        assetIds: [],
        assetVersionIds: [],
        scoringJobIds: [],
        complianceDocumentIds: [],
        reviewIds: [],
        releaseIds: [],
      };
    }

    const [
      campaignMembers,
      assets,
      complianceDocuments,
    ] =
      await Promise.all([
        this.prisma.campaignMember.findMany({
          where: {
            campaignId: {
              in:
                campaignIds,
            },
          },

          select: {
            id:
              true,
          },
        }),

        this.prisma.asset.findMany({
          where: {
            campaignId: {
              in:
                campaignIds,
            },
          },

          select: {
            id:
              true,
          },
        }),

        this.prisma.complianceDocument.findMany({
          where: {
            campaignId: {
              in:
                campaignIds,
            },
          },

          select: {
            id:
              true,
          },
        }),
      ]);

    const assetIds =
      assets.map(
        (asset) =>
          asset.id,
      );

    const assetVersions =
      assetIds.length > 0
        ? await this.prisma.assetVersion.findMany({
            where: {
              assetId: {
                in:
                  assetIds,
              },
            },

            select: {
              id:
                true,
            },
          })
        : [];

    const assetVersionIds =
      assetVersions.map(
        (version) =>
          version.id,
      );

    const [
      scoringJobs,
      reviews,
      releases,
    ] =
      assetVersionIds.length > 0
        ? await Promise.all([
            this.prisma.scoringJob.findMany({
              where: {
                assetVersionId: {
                  in:
                    assetVersionIds,
                },
              },

              select: {
                id:
                  true,
              },
            }),

            this.prisma.review.findMany({
              where: {
                assetVersionId: {
                  in:
                    assetVersionIds,
                },
              },

              select: {
                id:
                  true,
              },
            }),

            this.prisma.release.findMany({
              where: {
                assetVersionId: {
                  in:
                    assetVersionIds,
                },
              },

              select: {
                id:
                  true,
              },
            }),
          ])
        : [
            [],
            [],
            [],
          ];

    return {
      campaignIds,

      campaignMemberIds:
        campaignMembers.map(
          (member) =>
            member.id,
        ),

      assetIds,

      assetVersionIds,

      scoringJobIds:
        scoringJobs.map(
          (job) =>
            job.id,
        ),

      complianceDocumentIds:
        complianceDocuments.map(
          (document) =>
            document.id,
        ),

      reviewIds:
        reviews.map(
          (review) =>
            review.id,
        ),

      releaseIds:
        releases.map(
          (release) =>
            release.id,
        ),
    };
  }

  private buildScopeWhere(
    scope: AuditScope,
  ) {
    return [
      {
        entityType:
          'Campaign',

        entityId: {
          in:
            scope.campaignIds,
        },
      },

      {
        entityType:
          'CampaignMember',

        entityId: {
          in:
            scope.campaignMemberIds,
        },
      },

      {
        entityType:
          'Asset',

        entityId: {
          in:
            scope.assetIds,
        },
      },

      {
        entityType:
          'AssetVersion',

        entityId: {
          in:
            scope.assetVersionIds,
        },
      },

      {
        entityType:
          'ScoringJob',

        entityId: {
          in:
            scope.scoringJobIds,
        },
      },

      {
        entityType:
          'ComplianceDocument',

        entityId: {
          in:
            scope.complianceDocumentIds,
        },
      },

      {
        entityType:
          'Review',

        entityId: {
          in:
            scope.reviewIds,
        },
      },

      {
        entityType:
          'Release',

        entityId: {
          in:
            scope.releaseIds,
        },
      },
    ];
  }

  async findAll(
    userId: number,
  ) {
    const scope =
      await this.getScope(
        userId,
      );

    return this.prisma.auditLog.findMany({
      where: {
        OR:
          this.buildScopeWhere(
            scope,
          ),
      },

      orderBy: {
        createdAt:
          'desc',
      },

      include: {
        user: {
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
  }

  async findByEntity(
    entityType: string,
    entityId: number,
    userId: number,
  ) {
    const scope =
      await this.getScope(
        userId,
      );

    const allowedEntityTypes:
      Record<
        string,
        number[]
      > = {
        Campaign:
          scope.campaignIds,

        CampaignMember:
          scope.campaignMemberIds,

        Asset:
          scope.assetIds,

        AssetVersion:
          scope.assetVersionIds,

        ScoringJob:
          scope.scoringJobIds,

        ComplianceDocument:
          scope.complianceDocumentIds,

        Review:
          scope.reviewIds,

        Release:
          scope.releaseIds,
      };

    const allowedIds =
      allowedEntityTypes[
        entityType
      ];

    if (!allowedIds) {
      throw new BadRequestException(
        'Unsupported audit entityType',
      );
    }

    if (
      !allowedIds.includes(
        entityId,
      )
    ) {
      throw new ForbiddenException(
        'You do not have access to this audit entity',
      );
    }

    return this.prisma.auditLog.findMany({
      where: {
        entityType,

        entityId,
      },

      orderBy: {
        createdAt:
          'asc',
      },

      include: {
        user: {
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
  }
}