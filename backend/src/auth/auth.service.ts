import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'

import { PrismaService } from '../prisma/prisma.service.js'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
  ) {
    const normalizedEmail =
      email?.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      throw new BadRequestException(
        'Email and password are required',
      )
    }

    const user =
      await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      })

    if (!user?.passwordHash) {
      throw new UnauthorizedException(
        'Invalid email or password',
      )
    }

    const passwordMatches =
      await compare(
        password,
        user.passwordHash,
      )

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Invalid email or password',
      )
    }

    const token =
      await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }

  async getCurrentUser(
    userId: number,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          campaignMemberships: {
            select: {
              campaignId: true,
              role: true,
            },
          },
          campaignsOwned: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

    if (!user) {
      throw new UnauthorizedException(
        'User no longer exists',
      )
    }

    return user
  }
}