import {
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Redirect,
  Res,
} from "@nestjs/common"

import type {
  Response,
} from "express"

import {
  WordPressAuthService,
} from "./wordpress-auth.service.js"

const SESSION_COOKIE =
  "bca_session"

const SESSION_MAX_AGE_MS =
  7 *
  24 *
  60 *
  60 *
  1000

const FRONTEND_APP_URL =
  process.env.FRONTEND_APP_URL?.trim() ||
  "http://localhost:5173/app/"

@Controller(
  "auth/wordpress",
)
export class WordPressAuthController {
  constructor(
    private readonly wordpressAuthService:
      WordPressAuthService,
  ) {}

  private setSessionCookie(
    response: Response,
    token: string,
  ) {
    response.cookie(
      SESSION_COOKIE,
      token,
      {
        httpOnly:
          true,

        secure:
          process.env.NODE_ENV ===
          "production",

        sameSite:
          "lax",

        maxAge:
          SESSION_MAX_AGE_MS,

        path:
          "/",
      },
    )
  }

  @Post(
    "exchange",
  )
  async exchange(
    @Headers(
      "x-bca-wp-user-id",
    )
    wpUserId:
      string,

    @Headers(
      "x-bca-wp-email",
    )
    email:
      string,

    @Headers(
      "x-bca-wp-name-b64",
    )
    nameBase64:
      string,

    @Headers(
      "x-bca-wp-timestamp",
    )
    timestamp:
      string,

    @Headers(
      "x-bca-wp-signature",
    )
    signature:
      string,

    @Res({
      passthrough:
        true,
    })
    response:
      Response,
  ) {
    const result =
      await this.wordpressAuthService.exchange(
        {
          wpUserId:
            wpUserId ?? "",

          email:
            email ?? "",

          nameBase64:
            nameBase64 ?? "",

          timestamp:
            timestamp ?? "",

          signature:
            signature ?? "",
        },
      )

    this.setSessionCookie(
      response,
      result.token,
    )

    return {
      message:
        "WordPress session connected successfully",

      user:
        result.user,
    }
  }

  @Get(
    "callback",
  )
  async callback(
    @Query("wpUserId")
    wpUserId:
      string,

    @Query("email")
    email:
      string,

    @Query("nameBase64")
    nameBase64:
      string,

    @Query("timestamp")
    timestamp:
      string,

    @Query("signature")
    signature:
      string,

    @Res()
    response:
      Response,
  ) {
    const result =
      await this.wordpressAuthService.exchange(
        {
          wpUserId:
            wpUserId ?? "",

          email:
            email ?? "",

          nameBase64:
            nameBase64 ?? "",

          timestamp:
            timestamp ?? "",

          signature:
            signature ?? "",
        },
      )

    this.setSessionCookie(
      response,
      result.token,
    )

    return response.redirect(
      FRONTEND_APP_URL,
    )
  }
}