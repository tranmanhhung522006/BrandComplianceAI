import 'dotenv/config'

import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import { AppModule } from './app.module.js'

function getAllowedOrigins() {
  const configuredOrigins =
    process.env.CORS_ORIGINS
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []

  if (configuredOrigins.length > 0) {
    return configuredOrigins
  }

  return [
    'http://localhost:5173',
  ]
}

function isSafeMethod(
  method: string,
) {
  return [
    'GET',
    'HEAD',
    'OPTIONS',
  ].includes(method)
}

async function bootstrap() {
  const app =
    await NestFactory.create(AppModule)

  const expressApp =
    app.getHttpAdapter().getInstance()

  expressApp.set(
    'trust proxy',
    1,
  )

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  )

  app.use(cookieParser())

  const allowedOrigins =
    getAllowedOrigins()

  app.use(
    (
      req: {
        method: string
        headers: Record<
          string,
          string | string[] | undefined
        >
      },
      res: {
        status: (
          statusCode: number,
        ) => {
          json: (
            body: unknown,
          ) => void
        }
      },
      next: () => void,
    ) => {
      if (
        isSafeMethod(
          req.method,
        )
      ) {
        next()

        return
      }

      const fetchSiteHeader =
        req.headers[
          'sec-fetch-site'
        ]

      const fetchSite =
        Array.isArray(
          fetchSiteHeader,
        )
          ? fetchSiteHeader[0]
          : fetchSiteHeader

      if (
        fetchSite ===
        'cross-site'
      ) {
        res
          .status(403)
          .json({
            statusCode:
              403,

            message:
              'Cross-site request blocked',

            error:
              'Forbidden',
          })

        return
      }

      const originHeader =
        req.headers.origin

      const origin =
        Array.isArray(
          originHeader,
        )
          ? originHeader[0]
          : originHeader

      if (
        origin &&
        !allowedOrigins.includes(
          origin,
        )
      ) {
        res
          .status(403)
          .json({
            statusCode:
              403,

            message:
              'Request origin is not allowed',

            error:
              'Forbidden',
          })

        return
      }

      const refererHeader =
        req.headers.referer

      const referer =
        Array.isArray(
          refererHeader,
        )
          ? refererHeader[0]
          : refererHeader

      if (
        !origin &&
        referer
      ) {
        try {
          const refererOrigin =
            new URL(
              referer,
            ).origin

          if (
            !allowedOrigins.includes(
              refererOrigin,
            )
          ) {
            res
              .status(403)
              .json({
                statusCode:
                  403,

                message:
                  'Request referer is not allowed',

                error:
                  'Forbidden',
              })

            return
          }
        } catch {
          res
            .status(403)
            .json({
              statusCode:
                403,

              message:
                'Invalid request referer',

              error:
                'Forbidden',
            })

          return
        }
      }

      next()
    },
  )

  const loginLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,

      limit:
        10,

      standardHeaders:
        'draft-8',

      legacyHeaders:
        false,

      message: {
        statusCode:
          429,

        message:
          'Too many login attempts. Please try again later.',

        error:
          'Too Many Requests',
      },

      skipSuccessfulRequests:
        true,
    })

  app.use(
    '/auth/login',
    loginLimiter,
  )

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (
        error: Error | null,
        allow?: boolean,
      ) => void,
    ) => {
      if (!origin) {
        callback(
          null,
          true,
        )

        return
      }

      if (
        allowedOrigins.includes(
          origin,
        )
      ) {
        callback(
          null,
          true,
        )

        return
      }

      callback(
        new Error(
          'Origin is not allowed by CORS',
        ),
        false,
      )
    },

    methods: [
      'GET',
      'POST',
      'PATCH',
      'PUT',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
    ],

    credentials:
      true,
  })

  await app.listen(
    process.env.PORT ?? 3000,
  )
}

void bootstrap()