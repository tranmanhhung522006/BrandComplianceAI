import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssetVersionStatus,
  CampaignRole,
  CheckDecision,
  ReviewDecision,
} from '../generated/prisma/enums.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async submitReview(
    assetVersionId: number,
    checkerId: number,
    decision: string,
    comment?: string,
    checkDecisions?: {
      aiCheckResultId: number;
      decision: string;
      comment?: string;
    }[],
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

    if (
      decision !==
        ReviewDecision.APPROVED &&
      decision !==
        ReviewDecision.REJECTED
    ) {
      throw new BadRequestException(
        'Decision must be APPROVED or REJECTED',
      );
    }

    if (
      decision ===
        ReviewDecision.REJECTED &&
      !comment?.trim()
    ) {
      throw new BadRequestException(
        'A rejection comment is required',
      );
    }

    const version =
      await this.prisma.assetVersion.findUnique({
        where: {
          id:
            assetVersionId,
        },

        include: {
          asset: {
            include: {
              campaign: {
                include: {
                  members: {
                    where: {
                      userId:
                        checkerId,
                    },
                  },
                },
              },
            },
          },

          aiCheckResults:
            true,
        },
      });

    if (!version) {
      throw new NotFoundException(
        'Asset version not found',
      );
    }

    if (
      version.status !==
      AssetVersionStatus.IN_REVIEW
    ) {
      throw new BadRequestException(
        `Only IN_REVIEW versions can be reviewed. Current status: ${version.status}`,
      );
    }

    if (
      version.uploadedById ===
      checkerId
    ) {
      throw new ForbiddenException(
        'Maker who uploaded this version cannot be the checker',
      );
    }

    const membership =
      version.asset.campaign.members[0];

    if (
      membership?.role !==
      CampaignRole.CHECKER
    ) {
      throw new ForbiddenException(
        'Only a Checker assigned to this campaign can review this version',
      );
    }

    const checker =
      await this.prisma.user.findUnique({
        where: {
          id:
            checkerId,
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

    if (!checker) {
      throw new NotFoundException(
        'Checker user not found',
      );
    }

    if (checkDecisions) {
      const seenCheckIds =
        new Set<number>();

      for (
        const item
        of checkDecisions
      ) {
        if (
          seenCheckIds.has(
            item.aiCheckResultId,
          )
        ) {
          throw new BadRequestException(
            `AI check ${item.aiCheckResultId} was submitted more than once`,
          );
        }

        seenCheckIds.add(
          item.aiCheckResultId,
        );

        const aiCheck =
          version.aiCheckResults.find(
            (check) =>
              check.id ===
              item.aiCheckResultId,
          );

        if (!aiCheck) {
          throw new BadRequestException(
            `AI check ${item.aiCheckResultId} does not belong to this version`,
          );
        }

        if (
          item.decision !==
            CheckDecision.ACCEPT_AI &&
          item.decision !==
            CheckDecision.OVERRIDE_PASS &&
          item.decision !==
            CheckDecision.OVERRIDE_FAIL
        ) {
          throw new BadRequestException(
            'Invalid check decision',
          );
        }

        if (
          item.decision !==
            CheckDecision.ACCEPT_AI &&
          !item.comment?.trim()
        ) {
          throw new BadRequestException(
            `Override comment is required for AI check ${item.aiCheckResultId}`,
          );
        }
      }
    }

    const nextStatus =
      decision ===
      ReviewDecision.APPROVED
        ? AssetVersionStatus.APPROVED
        : AssetVersionStatus.REJECTED;

    return this.prisma.$transaction(
      async (tx) => {
        const claimedVersion =
          await tx.assetVersion.updateMany({
            where: {
              id:
                assetVersionId,

              status:
                AssetVersionStatus.IN_REVIEW,
            },

            data: {
              status:
                nextStatus,
            },
          });

        if (
          claimedVersion.count !==
          1
        ) {
          throw new BadRequestException(
            'This version has already been reviewed by another request',
          );
        }

        const review =
          await tx.review.create({
            data: {
              assetVersionId,

              checkerId,

              decision:
                decision as
                  ReviewDecision,

              comment:
                comment?.trim() ||
                null,
            },
          });

        if (checkDecisions) {
          for (
            const item
            of checkDecisions
          ) {
            await tx.reviewCheckDecision.create({
              data: {
                reviewId:
                  review.id,

                aiCheckResultId:
                  item.aiCheckResultId,

                decision:
                  item.decision as
                    CheckDecision,

                comment:
                  item.comment?.trim() ||
                  null,
              },
            });
          }
        }

        const updatedVersion =
          await tx.assetVersion.findUnique({
            where: {
              id:
                assetVersionId,
            },
          });

        const action =
          decision ===
          ReviewDecision.APPROVED
            ? 'CHECKER_APPROVED'
            : 'CHECKER_REJECTED';

        const auditLog =
          await tx.auditLog.create({
            data: {
              action,

              entityType:
                'AssetVersion',

              entityId:
                assetVersionId,

              userId:
                checkerId,

              details:
                JSON.stringify({
                  reviewId:
                    review.id,

                  checkerId:
                    checker.id,

                  checkerName:
                    checker.name,

                  checkerEmail:
                    checker.email,

                  decision,

                  comment:
                    comment?.trim() ||
                    null,

                  fromStatus:
                    AssetVersionStatus.IN_REVIEW,

                  toStatus:
                    nextStatus,

                  checkDecisions:
                    checkDecisions ??
                    [],
                }),
            },
          });

        return {
          message:
            'Review submitted successfully',

          review: {
            ...review,

            checker,
          },

          version:
            updatedVersion,

          auditLog,
        };
      },
    );
  }

  async getReviewQueue(
    checkerId: number,
  ) {
    const memberships =
      await this.prisma.campaignMember.findMany({
        where: {
          userId:
            checkerId,

          role:
            CampaignRole.CHECKER,
        },

        select: {
          campaignId:
            true,
        },
      });

    const campaignIds =
      memberships.map(
        (membership) =>
          membership.campaignId,
      );

    if (
      campaignIds.length === 0
    ) {
      return [];
    }

    const queue =
      await this.prisma.assetVersion.findMany({
        where: {
          status:
            AssetVersionStatus.IN_REVIEW,

          uploadedById: {
            not:
              checkerId,
          },

          asset: {
            campaignId: {
              in:
                campaignIds,
            },
          },
        },

        include: {
          asset: {
            include: {
              campaign:
                true,
            },
          },

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

          aiCheckResults: {
            orderBy: {
              createdAt:
                'asc',
            },
          },
        },

        orderBy: {
          createdAt:
            'asc',
        },
      });

    return queue.sort(
      (a, b) => {
        const aDeadline =
          a.asset.campaign.deadline
            ?.getTime() ??
          Number.POSITIVE_INFINITY;

        const bDeadline =
          b.asset.campaign.deadline
            ?.getTime() ??
          Number.POSITIVE_INFINITY;

        if (
          aDeadline !==
          bDeadline
        ) {
          return (
            aDeadline -
            bDeadline
          );
        }

        return (
          a.createdAt.getTime() -
          b.createdAt.getTime()
        );
      },
    );
  }

  async getVersionReviews(
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

    const version =
      await this.prisma.assetVersion.findUnique({
        where: {
          id:
            assetVersionId,
        },

        select: {
          id:
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
        'You do not have access to this version',
      );
    }

    return this.prisma.review.findMany({
      where: {
        assetVersionId,
      },

      include: {
        checker: {
          select: {
            id:
              true,

            email:
              true,

            name:
              true,
          },
        },

        checkDecisions: {
          include: {
            aiCheckResult:
              true,
          },

          orderBy: {
            createdAt:
              'asc',
          },
        },
      },

      orderBy: {
        createdAt:
          'asc',
      },
    });
  }
}