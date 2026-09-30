import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ReviewsService } from './reviews.service.js';

@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get('queue')
  getQueue(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.reviewsService.getReviewQueue(
      user.id,
    );
  }

  @Get('versions/:versionId')
  getVersionReviews(
    @Param('versionId')
    versionId: string,

    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.reviewsService.getVersionReviews(
      Number(versionId),
      user.id,
    );
  }

  @Post('versions/:versionId')
  submitReview(
    @Param('versionId')
    versionId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    body: {
      decision:
        | 'APPROVED'
        | 'REJECTED';

      comment?: string;

      checkDecisions?: {
        aiCheckResultId: number;

        decision:
          | 'ACCEPT_AI'
          | 'OVERRIDE_PASS'
          | 'OVERRIDE_FAIL';

        comment?: string;
      }[];
    },
  ) {
    return this.reviewsService.submitReview(
      Number(versionId),
      user.id,
      body.decision,
      body.comment,
      body.checkDecisions,
    );
  }
}