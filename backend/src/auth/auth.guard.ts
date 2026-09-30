import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'

import {
  JwtService,
} from '@nestjs/jwt'

import type {
  Request,
} from 'express'

import {
  PrismaService,
} from '../prisma/prisma.service.js'

import type {
  AuthenticatedUser,
} from './auth.types.js'

interface SessionJwtPayload {
  sub?: unknown
  email?: unknown
  iat?: number
  exp?: number
}

interface AuthenticatedRequest
  extends Request {
  user?: AuthenticatedUser
}

@Injectable()
export class AuthGuard
  implements CanActivate
{
  constructor(
    private readonly jwtService:
      JwtService,

    private readonly prisma:
      PrismaService,
  ) {}

  async canActivate(
    context:
      ExecutionContext,
  ): Promise<boolean> {
    const request =
      context
        .switchToHttp()
        .getRequest<
          AuthenticatedRequest
        >()

    const rawToken =
      request.cookies?.bca_session

    const token =
      typeof rawToken ===
      'string'
        ? rawToken
        : undefined

    if (!token) {
      throw new UnauthorizedException(
        'Authentication required',
      )
    }

    let payload:
      SessionJwtPayload

    try {
      payload =
        await this.jwtService.verifyAsync<
          SessionJwtPayload
        >(token)
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired session',
      )
    }

    const userId =
      typeof payload.sub ===
      'number'
        ? payload.sub
        : Number(
            payload.sub,
          )

    if (
      !Number.isInteger(
        userId,
      ) ||
      userId <= 0
    ) {
      throw new UnauthorizedException(
        'Invalid session',
      )
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          id:
            userId,
        },

        select: {
          id:
            true,

          email:
            true,

          name:
            true,
        },
      })

    if (!user) {
      throw new UnauthorizedException(
        'User account no longer exists',
      )
    }

    request.user = {
      id:
        user.id,

      email:
        user.email,

      name:
        user.name,
    }

    return true
  }
}