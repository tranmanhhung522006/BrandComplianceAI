import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Cron,
} from '@nestjs/schedule';

import {
  AssetVersionStatus,
  ScoringJobStatus,
} from '../generated/prisma/enums.js';

import {
  PrismaService,
} from '../prisma/prisma.service.js';

import {
  ScoringService,
} from './scoring.service.js';

@Injectable()
export class ScoringWorker {
  private readonly logger =
    new Logger(
      ScoringWorker.name,
    );

  private isRunning =
    false;

  private readonly stuckAfterMs =
    4 * 60 * 1000;

  constructor(
    private readonly prisma:
      PrismaService,

    private readonly scoringService:
      ScoringService,
  ) {}

  @Cron('*/5 * * * * *')
  async processPendingJobs() {
    if (this.isRunning) {
      return;
    }

    this.isRunning =
      true;

    try {
      const job =
        await this.prisma.scoringJob.findFirst({
          where: {
            status:
              ScoringJobStatus.PENDING,
          },

          orderBy: {
            createdAt:
              'asc',
          },
        });

      if (!job) {
        return;
      }

      this.logger.log(
        `Processing scoring job ${job.id}`,
      );

      try {
        await this.scoringService.processWithAI(
          job.id,
        );

        this.logger.log(
          `Scoring job ${job.id} completed`,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error';

        this.logger.error(
          `Scoring job ${job.id} failed: ${message}`,
        );
      }
    } finally {
      this.isRunning =
        false;
    }
  }

  @Cron('0 * * * * *')
  async recoverStuckJobs() {
    const cutoff =
      new Date(
        Date.now() -
          this.stuckAfterMs,
      );

    const stuckJobs =
      await this.prisma.scoringJob.findMany({
        where: {
          status:
            ScoringJobStatus.PROCESSING,

          startedAt: {
            lt: cutoff,
          },
        },

        orderBy: {
          startedAt:
            'asc',
        },
      });

    if (stuckJobs.length === 0) {
      return;
    }

    for (const job of stuckJobs) {
      const recovered =
        await this.prisma.$transaction(
          async (tx) => {
            const jobUpdate =
              await tx.scoringJob.updateMany({
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
                    'Scoring job timed out or became stuck',
                },
              });

            if (
              jobUpdate.count === 0
            ) {
              return false;
            }

            await tx.assetVersion.updateMany({
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

            return true;
          },
        );

      if (!recovered) {
        continue;
      }

      await this.prisma.auditLog.create({
        data: {
          action:
            'SCORING_STUCK_RECOVERED',

          entityType:
            'ScoringJob',

          entityId:
            job.id,

          details:
            JSON.stringify({
              assetVersionId:
                job.assetVersionId,

              previousStatus:
                ScoringJobStatus.PROCESSING,

              newStatus:
                ScoringJobStatus.FAILED,

              reason:
                'Processing exceeded the allowed time',
            }),
        },
      });

      this.logger.warn(
        `Recovered stuck scoring job ${job.id}`,
      );
    }
  }
}