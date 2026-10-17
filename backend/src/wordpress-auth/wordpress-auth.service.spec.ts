import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import { WordPressAuthService } from './wordpress-auth.service.js'
import { WordPressAuthController } from './wordpress-auth.controller.js'

const secret = 'test-only-wordpress-sso-secret'

function signedIdentity(overrides: Record<string, string> = {}) {
  const input = {
    wpUserId: '42',
    email: 'maker@example.com',
    nameBase64: Buffer.from('Test Maker').toString('base64'),
    timestamp: String(Math.floor(Date.now() / 1000)),
    ...overrides,
  }
  return {
    ...input,
    signature: createHmac('sha256', secret)
      .update([input.timestamp, input.wpUserId, input.email, input.nameBase64].join('\n'))
      .digest('hex'),
  }
}

function createService() {
  const prisma = {
    user: {
      upsert: vi.fn(async () => ({
        id: 7,
        email: 'maker@example.com',
        name: 'Test Maker',
      })),
      findUnique: vi.fn(async () => ({
        id: 7,
        email: 'maker@example.com',
        name: 'Test Maker',
        campaignMemberships: [],
        campaignsOwned: [],
      })),
    },
  }
  const jwt = {
    signAsync: vi.fn(async () => 'signed-app-jwt'),
  }
  const service = new WordPressAuthService(prisma as never, jwt as never)
  return { prisma, jwt, service }
}

describe('WordPress SSO signed exchange', () => {
  it('accepts a correctly signed active WordPress identity', async () => {
    vi.stubEnv('WORDPRESS_SSO_SECRET', secret)
    try {
      const { service, prisma, jwt } = createService()
      const result = await service.exchange(signedIdentity())
      expect(result.token).toBe('signed-app-jwt')
      expect(result.user.email).toBe('maker@example.com')
      expect(prisma.user.upsert).toHaveBeenCalledOnce()
      expect(jwt.signAsync).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('rejects a tampered identity before any database write', async () => {
    vi.stubEnv('WORDPRESS_SSO_SECRET', secret)
    try {
      const { service, prisma } = createService()
      await expect(service.exchange({
        ...signedIdentity(),
        email: 'attacker@example.com',
      })).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.user.upsert).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('rejects an expired identity before any database write', async () => {
    vi.stubEnv('WORDPRESS_SSO_SECRET', secret)
    try {
      const { service, prisma } = createService()
      const expired = signedIdentity({
        timestamp: String(Math.floor(Date.now() / 1000) - 120),
      })
      await expect(service.exchange(expired)).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.user.upsert).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('rejects a malformed signature', async () => {
    vi.stubEnv('WORDPRESS_SSO_SECRET', secret)
    try {
      const { service } = createService()
      await expect(service.exchange({
        ...signedIdentity(),
        signature: 'not-valid-hex',
      })).rejects.toBeInstanceOf(UnauthorizedException)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('WordPress SSO response cookie', () => {
  it('sets HttpOnly, secure, SameSite and path on successful exchange', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const exchange = vi.fn(async () => ({
        token: 'signed-app-jwt',
        user: { id: 7, email: 'maker@example.com' },
      }))
      const controller = new WordPressAuthController({ exchange } as never)
      const response = { cookie: vi.fn() }
      const identity = signedIdentity()
      await controller.exchange(
        identity.wpUserId,
        identity.email,
        identity.nameBase64,
        identity.timestamp,
        identity.signature,
        response as never,
      )
      expect(response.cookie).toHaveBeenCalledWith(
        'bca_session',
        'signed-app-jwt',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
        }),
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
