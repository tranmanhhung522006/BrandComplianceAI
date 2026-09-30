import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AssetVersionStatus,
  CheckType,
  ScoringJobStatus,
} from '../generated/prisma/enums.js';

import {
  AiService,
} from '../ai/ai.service.js';

import {
  AuditService,
} from '../audit/audit.service.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

@Injectable()
export class ScoringService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly aiService:
      AiService,

    private readonly audit:
      AuditService,
  ) {}

  private async assertVersionAccess(
    versionId: number,
    userId: number,
  ) {
    const version =
      await this.prisma.assetVersion.findUnique({
        where: {
          id:
            versionId,
        },

        include: {
          asset: {
            include: {
              campaign: {
                include: {
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
        `AssetVersion ${versionId} not found`,
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

    return version;
  }

  async startScoring(
    versionId: number,
    userId?: number,
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

    let version;

    if (
      userId !== undefined
    ) {
      version =
        await this.assertVersionAccess(
          versionId,
          userId,
        );
    } else {
      version =
        await this.prisma.assetVersion.findUnique({
          where: {
            id:
              versionId,
          },
        });

      if (!version) {
        throw new NotFoundException(
          `AssetVersion ${versionId} not found`,
        );
      }
    }

    if (
      version.status !==
      AssetVersionStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Only DRAFT versions can start scoring. Current status: ${version.status}`,
      );
    }

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const claimedVersion =
            await tx.assetVersion.updateMany({
              where: {
                id:
                  versionId,

                status:
                  AssetVersionStatus.DRAFT,
              },

              data: {
                status:
                  AssetVersionStatus.SCORING,
              },
            });

          if (
            claimedVersion.count !==
            1
          ) {
            throw new BadRequestException(
              'Scoring has already been started for this version',
            );
          }

          const job =
            await tx.scoringJob.create({
              data: {
                assetVersionId:
                  versionId,

                status:
                  ScoringJobStatus.PENDING,

                retryCount:
                  0,

                startedAt:
                  null,

                completedAt:
                  null,

                errorMessage:
                  null,
              },
            });

          const updatedVersion =
            await tx.assetVersion.findUnique({
              where: {
                id:
                  versionId,
              },
            });

          if (!updatedVersion) {
            throw new NotFoundException(
              `AssetVersion ${versionId} not found`,
            );
          }

          return {
            version:
              updatedVersion,

            job,
          };
        },
      );

    await this.audit.log(
      'SCORING_STARTED',
      'AssetVersion',
      versionId,
      version.uploadedById,
      {
        scoringJobId:
          result.job.id,

        assetVersionId:
          versionId,

        fromStatus:
          AssetVersionStatus.DRAFT,

        toStatus:
          AssetVersionStatus.SCORING,
      },
    );

    return {
      message:
        'Scoring started',

      ...result,
    };
  }

  async processWithAI(
    jobId: number,
  ) {
    const job =
      await this.prisma.scoringJob.findUnique({
        where: {
          id:
            jobId,
        },

        include: {
          assetVersion:
            true,
        },
      });

    if (!job) {
      throw new NotFoundException(
        `ScoringJob ${jobId} not found`,
      );
    }

    const claimedJob =
      await this.prisma.scoringJob.updateMany({
        where: {
          id:
            job.id,

          status:
            ScoringJobStatus.PENDING,
        },

        data: {
          status:
            ScoringJobStatus.PROCESSING,

          startedAt:
            new Date(),

          completedAt:
            null,

          errorMessage:
            null,
        },
      });

    if (
      claimedJob.count !==
      1
    ) {
      return {
        success:
          false,

        skipped:
          true,

        message:
          'Scoring job was already claimed by another worker',

        jobId:
          job.id,
      };
    }

    await this.audit.log(
      'AI_SCORING_STARTED',
      'ScoringJob',
      job.id,
      undefined,
      {
        assetVersionId:
          job.assetVersionId,

        model:
          'gpt-5.6-luna',

        mode:
          'real',

        fromStatus:
          ScoringJobStatus.PENDING,

        toStatus:
          ScoringJobStatus.PROCESSING,
      },
    );

    try {
      const aiResult =
        await this.aiService.scoreVersion(
          job.assetVersionId,
        );

      const result =
        await this.prisma.$transaction(
          async (tx) => {
            const completedJobClaim =
              await tx.scoringJob.updateMany({
                where: {
                  id:
                    job.id,

                  status:
                    ScoringJobStatus.PROCESSING,
                },

                data: {
                  status:
                    ScoringJobStatus.COMPLETED,

                  completedAt:
                    new Date(),

                  errorMessage:
                    null,
                },
              });

            if (
              completedJobClaim.count !==
              1
            ) {
              throw new Error(
                'Scoring job no longer owns the PROCESSING state',
              );
            }

            const savedChecks = [];

            for (
              const check
              of aiResult.checks
            ) {
              const savedCheck =
                await tx.aiCheckResult.create({
                  data: {
                    assetVersionId:
                      job.assetVersionId,

                    scoringJobId:
                      job.id,

                    checkType:
                      check.checkType as
                        CheckType,

                    score:
                      check.score,

                    reason:
                      check.reason,

                    ruleReference:
                      check.ruleReference,

                    sourceQuote:
                      check.sourceQuote?.trim() ||
                      null,

                    uncertainty:
                      check.uncertainty?.trim() ||
                      null,

                    modelName:
                      'gpt-5.6-luna',

                    modelVersion:
                      'current',

                    promptVersion:
                      '3.0',
                  },
                });

              savedChecks.push(
                savedCheck,
              );
            }

            const versionClaim =
              await tx.assetVersion.updateMany({
                where: {
                  id:
                    job.assetVersionId,

                  status:
                    AssetVersionStatus.SCORING,
                },

                data: {
                  status:
                    AssetVersionStatus.IN_REVIEW,
                },
              });

            if (
              versionClaim.count !==
              1
            ) {
              throw new Error(
                'Asset version is no longer in SCORING state',
              );
            }

            const completedJob =
              await tx.scoringJob.findUnique({
                where: {
                  id:
                    job.id,
                },
              });

            const updatedVersion =
              await tx.assetVersion.findUnique({
                where: {
                  id:
                    job.assetVersionId,
                },
              });

            return {
              version:
                updatedVersion,

              job:
                completedJob,

              checks:
                savedChecks,
            };
          },
        );

      await this.audit.log(
        'AI_SCORING_COMPLETED',
        'ScoringJob',
        job.id,
        undefined,
        {
          assetVersionId:
            job.assetVersionId,

          model:
            'gpt-5.6-luna',

          promptVersion:
            '3.0',

          resultCount:
            result.checks.length,

          fromStatus:
            AssetVersionStatus.SCORING,

          toStatus:
            AssetVersionStatus.IN_REVIEW,
        },
      );

      return {
        success:
          true,

        message:
          'Real AI scoring completed',

        model:
          'gpt-5.6-luna',

        ...result,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown AI error';

      const failedJob =
        await this.prisma.scoringJob.updateMany({
          where: {
            id:
              job.id,

            status:
              ScoringJobStatus.PROCESSING,
          },

          data: {
            status:
              ScoringJobStatus.FAILED,

            completedAt:
              new Date(),

            errorMessage:
              message.substring(
                0,
                1000,
              ),
          },
        });

      if (
        failedJob.count ===
        1
      ) {
        await this.prisma.assetVersion.updateMany({
          where: {
            id:
              job.assetVersionId,

            status:
              AssetVersionStatus.SCORING,
          },

          data: {
            status:
              AssetVersionStatus.DRAFT,
          },
        });

        await this.audit.log(
          'AI_SCORING_FAILED',
          'ScoringJob',
          job.id,
          undefined,
          {
            assetVersionId:
              job.assetVersionId,

            model:
              'gpt-5.6-luna',

            error:
              message.substring(
                0,
                1000,
              ),

            fromStatus:
              ScoringJobStatus.PROCESSING,

            toStatus:
              ScoringJobStatus.FAILED,
          },
        );
      }

      throw error;
    }
  }

  async getVersionScoring(
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

    await this.assertVersionAccess(
      versionId,
      userId,
    );

    const version =
      await this.prisma.assetVersion.findUnique({
        where: {
          id:
            versionId,
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

          scoringJobs: {
            orderBy: {
              createdAt:
                'desc',
            },

            include: {
              results: {
                orderBy: {
                  createdAt:
                    'asc',
                },
              },
            },
          },

          aiCheckResults: {
            orderBy: {
              createdAt:
                'asc',
            },
          },
        },
      });

    if (!version) {
      throw new NotFoundException(
        `AssetVersion ${versionId} not found`,
      );
    }

    return version;
  }

  async retryJob(
    jobId: number,
    userId: number,
  ) {
    if (
      !Number.isInteger(
        jobId,
      ) ||
      jobId <= 0
    ) {
      throw new BadRequestException(
        'jobId must be a positive integer',
      );
    }

    const job =
      await this.prisma.scoringJob.findUnique({
        where: {
          id:
            jobId,
        },

        include: {
          assetVersion: {
            include: {
              asset: {
                include: {
                  campaign: {
                    include: {
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
          },
        },
      });

    if (!job) {
      throw new NotFoundException(
        `ScoringJob ${jobId} not found`,
      );
    }

    const campaign =
      job.assetVersion.asset.campaign;

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
        'You do not have access to this scoring job',
      );
    }

    if (
      job.status !==
      ScoringJobStatus.FAILED
    ) {
      throw new BadRequestException(
        `Only FAILED jobs can be retried. Current status: ${job.status}`,
      );
    }

    if (
      job.retryCount >= 3
    ) {
      throw new BadRequestException(
        'Maximum retry limit reached',
      );
    }

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const claimedRetry =
            await tx.scoringJob.updateMany({
              where: {
                id:
                  job.id,

                status:
                  ScoringJobStatus.FAILED,

                retryCount: {
                  lt:
                    3,
                },
              },

              data: {
                status:
                  ScoringJobStatus.PENDING,

                retryCount: {
                  increment:
                    1,
                },

                errorMessage:
                  null,

                startedAt:
                  null,

                completedAt:
                  null,
              },
            });

          if (
            claimedRetry.count !==
            1
          ) {
            throw new BadRequestException(
              'This scoring job has already been retried by another request',
            );
          }

          const versionClaim =
            await tx.assetVersion.updateMany({
              where: {
                id:
                  job.assetVersionId,

                status:
                  AssetVersionStatus.DRAFT,
              },

              data: {
                status:
                  AssetVersionStatus.SCORING,
              },
            });

          if (
            versionClaim.count !==
            1
          ) {
            throw new BadRequestException(
              'Asset version is not available for scoring retry',
            );
          }

          const updatedJob =
            await tx.scoringJob.findUnique({
              where: {
                id:
                  job.id,
              },
            });

          const updatedVersion =
            await tx.assetVersion.findUnique({
              where: {
                id:
                  job.assetVersionId,
              },
            });

          if (
            !updatedJob ||
            !updatedVersion
          ) {
            throw new NotFoundException(
              'Scoring retry state could not be loaded',
            );
          }

          return {
            job:
              updatedJob,

            version:
              updatedVersion,
          };
        },
      );

    await this.audit.log(
      'SCORING_RETRY_QUEUED',
      'ScoringJob',
      job.id,
      userId,
      {
        assetVersionId:
          job.assetVersionId,

        retryCount:
          result.job.retryCount,

        fromStatus:
          ScoringJobStatus.FAILED,

        toStatus:
          ScoringJobStatus.PENDING,
      },
    );

    return {
      message:
        'Scoring job queued for retry',

      ...result,
    };
  }
}