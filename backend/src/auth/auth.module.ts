import 'dotenv/config'

import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { PrismaModule } from '../prisma/prisma.module.js'
import { AuthController } from './auth.controller.js'
import { AuthGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'

@Module({
  imports: [
    PrismaModule,

    JwtModule.registerAsync({
      useFactory: () => {
        const secret =
          process.env.JWT_SECRET

        if (!secret) {
          throw new Error(
            'JWT_SECRET is missing from .env',
          )
        }

        return {
          secret,
          signOptions: {
            expiresIn:
              7 * 24 * 60 * 60,
          },
        }
      },
    }),
  ],

  controllers: [
    AuthController,
  ],

  providers: [
    AuthService,
    AuthGuard,
  ],

  exports: [
    AuthService,
    AuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}