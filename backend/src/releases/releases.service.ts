import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssetVersionStatus,
  CampaignRole,
} from '../generated/prisma/enums.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

@Injectable()
export class ReleasesService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async releaseVersion(
    assetVersionId: number,
    releasedById: number,
    note?: string,
  ) {
    if (
      !Number.isInteger(
        assetVersionId,
      ) ||
      assetVersionId <= 0
    ) {
      throw new BadRequestException(
        'assetVersionId must be a positive integer',
      );
    }

    const version =
      await this.prisma.assetVersion.findUnique({
        where: {
          id:
            assetVersionId,
        },

        include: {
          release:
            true,

          asset: {
            include: {
              campaign: {
                include: {
                  members: {
                    where: {
                      userId:
                        releasedById,
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

    const membership =
      version.asset.campaign.members[0];

    if (
      membership?.role !==
      CampaignRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only an Admin assigned to this campaign can release this version',
      );
    }

    if (
      version.status !==
      AssetVersionStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Only APPROVED versions can be released. Current status: ${version.status}`,
      );
    }

    if (version.release) {
      throw new BadRequestException(
        'This version has already been released',
      );
    }

    const admin =
      await this.prisma.user.findUnique({
        where: {
          id:
            releasedById,
        },

        select: {
          id:
            true,

          email:
            true,

          name:
            true,
        },
      });

    if (!admin) {
      throw new NotFoundException(
        'Admin user not found',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const claimedVersion =
          await tx.assetVersion.updateMany({
            where: {
              id:
                assetVersionId,

              status:
                AssetVersionStatus.APPROVED,
            },

            data: {
              status:
                AssetVersionStatus.RELEASED,
            },
          });

        if (
          claimedVersion.count !==
          1
        ) {
          throw new BadRequestException(
            'This version has already been released by another request',
          );
        }

        const release =
          await tx.release.create({
            data: {
              assetVersionId,

              releasedById,

              note:
                note?.trim() ||
                null,
            },

            include: {
              releasedBy: {
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

        const notification =
          await tx.notification.create({
            data: {
              userId:
                version.asset.campaign.ownerId,

              campaignId:
                version.asset.campaignId,

              type:
                'ASSET_RELEASED',

              title:
                'Asset released',

              message:
                `${version.asset.name} v${version.versionNumber} was released by ${admin.name ?? admin.email}.`,

              assetId:
                version.assetId,

              assetVersionId,
            },
          });

        const updatedVersion =
          await tx.assetVersion.findUnique({
            where: {
              id:
                assetVersionId,
            },
          });

        const auditLog =
          await tx.auditLog.create({
            data: {
              action:
                'ADMIN_RELEASED',

              entityType:
                'AssetVersion',

              entityId:
                assetVersionId,

              userId:
                releasedById,

              details:
                JSON.stringify({
                  releaseId:
                    release.id,

                  notificationId:
                    notification.id,

                  campaignId:
                    version.asset.campaignId,

                  assetId:
                    version.assetId,

                  assetName:
                    version.asset.name,

                  assetVersionId,

                  versionNumber:
                    version.versionNumber,

                  releasedById:
                    admin.id,

                  adminName:
                    admin.name,

                  adminEmail:
                    admin.email,

                  note:
                    note?.trim() ||
                    null,

                  fromStatus:
                    AssetVersionStatus.APPROVED,

                  toStatus:
                    AssetVersionStatus.RELEASED,

                  releasedAt:
                    release.releasedAt,
                }),
            },
          });

        return {
          message:
            'Asset version released successfully',

          release,

          version:
            updatedVersion,

          notification,

          auditLog,
        };
      },
    );
  }

  async getRelease(
    assetVersionId: number,
    userId: number,
  ) {
    if (
      !Number.isInteger(
        assetVersionId,
      ) ||
      assetVersionId <= 0
    ) {
      throw new BadRequestException(
        'assetVersionId must be a positive integer',
      );
    }

    const release =
      await this.prisma.release.findUnique({
        where: {
          assetVersionId,
        },

        include: {
          releasedBy: {
            select: {
              id:
                true,

              email:
                true,

              name:
                true,
            },
          },

          assetVersion: {
            include: {
              asset: {
                include: {
                  campaign: {
                    select: {
                      id:
                        true,

                      name:
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

                          role:
                            true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!release) {
      throw new NotFoundException(
        'Release record not found',
      );
    }

    const campaign =
      release.assetVersion.asset.campaign;

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
        'You do not have access to this release',
      );
    }

    return release;
  }

  async getNotifications(
    userId: number,
    campaignId?: number,
  ) {
    return this.prisma.notification.findMany({
      where: {
        userId,

        ...(campaignId
          ? {
              campaignId,
            }
          : {}),
      },

      orderBy: {
        createdAt:
          'desc',
      },

      take:
        50,
    });
  }

  async markNotificationRead(
    notificationId: number,
    userId: number,
  ) {
    const notification =
      await this.prisma.notification.findUnique({
        where: {
          id:
            notificationId,
        },
      });

    if (!notification) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    if (
      notification.userId !==
      userId
    ) {
      throw new ForbiddenException(
        'You do not have access to this notification',
      );
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.notification.update({
      where: {
        id:
          notificationId,
      },

      data: {
        isRead:
          true,

        readAt:
          new Date(),
      },
    });
  }
}