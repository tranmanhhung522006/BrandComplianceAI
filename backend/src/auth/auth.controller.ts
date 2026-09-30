import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import type { Response } from 'express'

import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { CurrentUser } from './current-user.decorator.js'
import type { AuthenticatedUser } from './auth.types.js'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('login')
  async login(
    @Body()
    body: {
      email: string
      password: string
    },
    @Res({ passthrough: true })
    response: Response,
  ) {
    const result =
      await this.authService.login(
        body.email,
        body.password,
      )

    response.cookie(
      'bca_session',
      result.token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        maxAge:
          7 *
          24 *
          60 *
          60 *
          1000,
        path: '/',
      },
    )

    return {
      user: result.user,
    }
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.authService.getCurrentUser(
      user.id,
    )
  }

  @Post('logout')
  logout(
    @Res({ passthrough: true })
    response: Response,
  ) {
    response.clearCookie(
      'bca_session',
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'lax',
        path: '/',
      },
    )

    return {
      message: 'Logged out successfully',
    }
  }
}