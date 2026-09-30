import {
  createHmac,
  timingSafeEqual,
} from "node:crypto"

import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common"

import {
  JwtService,
} from "@nestjs/jwt"

import {
  PrismaService,
} from "../prisma/prisma.service.js"

const MAX_SSO_AGE_SECONDS =
  60

interface WordPressIdentityInput {
  wpUserId: string
  email: string
  nameBase64: string
  timestamp: string
  signature: string
}

@Injectable()
export class WordPressAuthService {
  constructor(
    private readonly prisma:
      PrismaService,

    private readonly jwtService:
      JwtService,
  ) {}

  private getSsoSecret() {
    const secret =
      process.env.WORDPRESS_SSO_SECRET?.trim()

    if (!secret) {
      throw new InternalServerErrorException(
        "WORDPRESS_SSO_SECRET is not configured",
      )
    }

    return secret
  }

  private validateTimestamp(
    timestamp: string,
  ) {
    const parsed =
      Number(timestamp)

    if (
      !Number.isInteger(
        parsed,
      )
    ) {
      throw new UnauthorizedException(
        "Invalid WordPress SSO timestamp",
      )
    }

    const now =
      Math.floor(
        Date.now() /
          1000,
      )

    const age =
      Math.abs(
        now -
          parsed,
      )

    if (
      age >
      MAX_SSO_AGE_SECONDS
    ) {
      throw new UnauthorizedException(
        "WordPress SSO request has expired",
      )
    }

    return parsed
  }

  private validateWpUserId(
    wpUserId: string,
  ) {
    const parsed =
      Number(wpUserId)

    if (
      !Number.isInteger(
        parsed,
      ) ||
      parsed <= 0
    ) {
      throw new UnauthorizedException(
        "Invalid WordPress user ID",
      )
    }

    return parsed
  }

  private normalizeEmail(
    email: string,
  ) {
    const normalized =
      email
        .trim()
        .toLowerCase()

    if (
      !normalized ||
      normalized.length >
        254 ||
      !normalized.includes(
        "@",
      )
    ) {
      throw new UnauthorizedException(
        "Invalid WordPress user email",
      )
    }

    return normalized
  }

  private decodeName(
    nameBase64: string,
  ) {
    if (
      !nameBase64 ||
      nameBase64.length >
        1024
    ) {
      return ""
    }

    try {
      return Buffer.from(
        nameBase64,
        "base64",
      )
        .toString(
          "utf8",
        )
        .trim()
        .slice(
          0,
          200,
        )
    } catch {
      throw new UnauthorizedException(
        "Invalid WordPress user name",
      )
    }
  }

  private validateSignature(
    input: {
      wpUserId: string
      email: string
      nameBase64: string
      timestamp: string
      signature: string
    },
  ) {
    if (
      !/^[a-f0-9]{64}$/i.test(
        input.signature,
      )
    ) {
      throw new UnauthorizedException(
        "Invalid WordPress SSO signature",
      )
    }

    const payload = [
      input.timestamp,
      input.wpUserId,
      input.email,
      input.nameBase64,
    ].join("\n")

    const expectedSignature =
      createHmac(
        "sha256",
        this.getSsoSecret(),
      )
        .update(
          payload,
          "utf8",
        )
        .digest(
          "hex",
        )

    const expected =
      Buffer.from(
        expectedSignature,
        "hex",
      )

    const received =
      Buffer.from(
        input.signature,
        "hex",
      )

    if (
      expected.length !==
        received.length ||
      !timingSafeEqual(
        expected,
        received,
      )
    ) {
      throw new UnauthorizedException(
        "Invalid WordPress SSO signature",
      )
    }
  }

  async exchange(
    input: WordPressIdentityInput,
  ) {
    this.validateTimestamp(
      input.timestamp,
    )

    this.validateWpUserId(
      input.wpUserId,
    )

    const email =
      this.normalizeEmail(
        input.email,
      )

    this.validateSignature(
      {
        wpUserId:
          input.wpUserId,

        email,

        nameBase64:
          input.nameBase64,

        timestamp:
          input.timestamp,

        signature:
          input.signature,
      },
    )

    const name =
      this.decodeName(
        input.nameBase64,
      )

    const user =
      await this.prisma.user.upsert(
        {
          where: {
            email,
          },

          update: {
            ...(name
              ? {
                  name,
                }
              : {}),
          },

          create: {
            email,

            name:
              name ||
              null,

            passwordHash:
              null,
          },

          select: {
            id:
              true,

            email:
              true,

            name:
              true,
          },
        },
      )

    const token =
      await this.jwtService.signAsync(
        {
          sub:
            user.id,

          email:
            user.email,
        },
      )

    const sessionUser =
      await this.prisma.user.findUnique(
        {
          where: {
            id:
              user.id,
          },

          select: {
            id:
              true,

            email:
              true,

            name:
              true,

            campaignMemberships: {
              select: {
                campaignId:
                  true,

                role:
                  true,

                campaign: {
                  select: {
                    id:
                      true,

                    name:
                      true,
                  },
                },
              },
            },

            campaignsOwned: {
              select: {
                id:
                  true,

                name:
                  true,
              },
            },
          },
        },
      )

    if (!sessionUser) {
      throw new UnauthorizedException(
        "WordPress user could not be synchronized",
      )
    }

    return {
      token,
      user:
        sessionUser,
    }
  }
}