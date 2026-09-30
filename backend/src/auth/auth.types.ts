export type AuthenticatedUser = {
  id: number
  email: string
  name: string | null
}

export type JwtPayload = {
  sub: number
  email: string
}