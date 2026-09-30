import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const API_URL =
  import.meta.env.VITE_API_URL ??
  "/api"

const APP_BASE =
  import.meta.env.VITE_APP_BASE ??
  "/"

const WORDPRESS_SSO_ENABLED =
  APP_BASE !== "/"

export type CampaignRole =
  | "MAKER"
  | "CHECKER"
  | "ADMIN"

export interface CampaignMembership {
  campaignId: number
  role: CampaignRole
}

export interface OwnedCampaign {
  id: number
  name: string
}

export interface AuthUser {
  id: number
  email: string
  name: string | null
  campaignMemberships: CampaignMembership[]
  campaignsOwned: OwnedCampaign[]
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  roles: CampaignRole[]

  hasRole: (
    role: CampaignRole,
  ) => boolean

  hasCampaignRole: (
    campaignId: number,
    role: CampaignRole,
  ) => boolean

  isCampaignOwner: (
    campaignId: number,
  ) => boolean

  canManageAssets: (
    campaignId: number,
  ) => boolean

  canAdminCampaign: (
    campaignId: number,
  ) => boolean

  login: (
    email: string,
    password: string,
  ) => Promise<void>

  logout: () => Promise<void>

  refreshSession: () => Promise<void>
}

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined)

function normalizeUser(
  data: AuthUser,
): AuthUser {
  return {
    id:
      data.id,

    email:
      data.email,

    name:
      data.name,

    campaignMemberships:
      data.campaignMemberships ??
      [],

    campaignsOwned:
      data.campaignsOwned ??
      [],
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null,
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const loadCurrentUser =
    useCallback(
      async () => {
        const response =
          await fetch(
            `${API_URL}/auth/me`,
            {
              credentials:
                "include",
            },
          )

        if (
          response.status ===
          401
        ) {
          return null
        }

        if (!response.ok) {
          throw new Error(
            "Could not load session",
          )
        }

        const data =
          (await response.json()) as AuthUser

        return normalizeUser(
          data,
        )
      },
      [],
    )

  const exchangeWordPressSession =
    useCallback(
      async () => {
        if (
          !WORDPRESS_SSO_ENABLED
        ) {
          return false
        }

        const response =
          await fetch(
            `${API_URL}/auth/wordpress/session`,
            {
              method:
                "POST",

              credentials:
                "include",
            },
          )

        if (
          response.status ===
          401
        ) {
          return false
        }

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => null,
              )

          throw new Error(
            data?.message ??
              "Could not connect WordPress session",
          )
        }

        return true
      },
      [],
    )

  const refreshSession =
    useCallback(
      async () => {
        setLoading(
          true,
        )

        try {
          const existingUser =
            await loadCurrentUser()

          if (
            existingUser
          ) {
            setUser(
              existingUser,
            )

            return
          }

          const exchanged =
            await exchangeWordPressSession()

          if (
            !exchanged
          ) {
            setUser(
              null,
            )

            return
          }

          const wordpressUser =
            await loadCurrentUser()

          setUser(
            wordpressUser,
          )
        } catch (error) {
          console.error(
            "Failed to refresh authentication session:",
            error,
          )

          setUser(
            null,
          )
        } finally {
          setLoading(
            false,
          )
        }
      },
      [
        exchangeWordPressSession,
        loadCurrentUser,
      ],
    )

  useEffect(() => {
    void refreshSession()
  }, [
    refreshSession,
  ])

  const roles =
    useMemo(
      () => {
        const roleSet =
          new Set<CampaignRole>()

        user?.campaignMemberships.forEach(
          (
            membership,
          ) => {
            roleSet.add(
              membership.role,
            )
          },
        )

        if (
          user &&
          user.campaignsOwned.length >
            0
        ) {
          roleSet.add(
            "MAKER",
          )

          roleSet.add(
            "ADMIN",
          )
        }

        return Array.from(
          roleSet,
        )
      },
      [
        user,
      ],
    )

  const hasRole =
    useCallback(
      (
        role: CampaignRole,
      ) =>
        roles.includes(
          role,
        ),
      [
        roles,
      ],
    )

  const isCampaignOwner =
    useCallback(
      (
        campaignId: number,
      ) => {
        if (!user) {
          return false
        }

        return user.campaignsOwned.some(
          (
            campaign,
          ) =>
            campaign.id ===
            campaignId,
        )
      },
      [
        user,
      ],
    )

  const hasCampaignRole =
    useCallback(
      (
        campaignId: number,
        role: CampaignRole,
      ) => {
        if (!user) {
          return false
        }

        const membership =
          user.campaignMemberships.find(
            (
              item,
            ) =>
              item.campaignId ===
              campaignId,
          )

        if (
          membership?.role ===
          role
        ) {
          return true
        }

        const owner =
          user.campaignsOwned.some(
            (
              campaign,
            ) =>
              campaign.id ===
              campaignId,
          )

        if (!owner) {
          return false
        }

        return (
          role === "MAKER" ||
          role === "ADMIN"
        )
      },
      [
        user,
      ],
    )

  const canManageAssets =
    useCallback(
      (
        campaignId: number,
      ) =>
        isCampaignOwner(
          campaignId,
        ) ||
        hasCampaignRole(
          campaignId,
          "MAKER",
        ),
      [
        hasCampaignRole,
        isCampaignOwner,
      ],
    )

  const canAdminCampaign =
    useCallback(
      (
        campaignId: number,
      ) =>
        isCampaignOwner(
          campaignId,
        ) ||
        hasCampaignRole(
          campaignId,
          "ADMIN",
        ),
      [
        hasCampaignRole,
        isCampaignOwner,
      ],
    )

  const login =
    useCallback(
      async (
        email: string,
        password: string,
      ) => {
        const response =
          await fetch(
            `${API_URL}/auth/login`,
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials:
                "include",

              body:
                JSON.stringify({
                  email,
                  password,
                }),
            },
          )

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => null,
              )

          throw new Error(
            data?.message ??
              "Invalid email or password",
          )
        }

        await refreshSession()
      },
      [
        refreshSession,
      ],
    )

  const logout =
    useCallback(
      async () => {
        if (
          WORDPRESS_SSO_ENABLED
        ) {
          try {
            const response =
              await fetch(
                `${API_URL}/auth/wordpress/logout`,
                {
                  method:
                    "POST",

                  credentials:
                    "include",
                },
              )

            const data =
              await response
                .json()
                .catch(
                  () => null,
                )

            if (
              !response.ok
            ) {
              throw new Error(
                data?.message ??
                  "Could not sign out",
              )
            }

            setUser(
              null,
            )

            if (
              data?.loginUrl
            ) {
              window.location.assign(
                data.loginUrl,
              )

              return
            }

            window.location.assign(
              "/wp-login.php",
            )

            return
          } catch (error) {
            console.error(
              "Failed to sign out from WordPress:",
              error,
            )

            setUser(
              null,
            )

            throw error
          }
        }

        try {
          await fetch(
            `${API_URL}/auth/logout`,
            {
              method:
                "POST",

              credentials:
                "include",
            },
          )
        } finally {
          setUser(
            null,
          )
        }
      },
      [],
    )

  const value =
    useMemo(
      () => ({
        user,
        loading,
        roles,
        hasRole,
        hasCampaignRole,
        isCampaignOwner,
        canManageAssets,
        canAdminCampaign,
        login,
        logout,
        refreshSession,
      }),
      [
        user,
        loading,
        roles,
        hasRole,
        hasCampaignRole,
        isCampaignOwner,
        canManageAssets,
        canAdminCampaign,
        login,
        logout,
        refreshSession,
      ],
    )

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    )

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    )
  }

  return context
}