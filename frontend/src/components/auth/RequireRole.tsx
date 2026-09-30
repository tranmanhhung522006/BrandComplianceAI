import {
  Navigate,
  Outlet,
} from "react-router-dom"

import {
  type CampaignRole,
  useAuth,
} from "@/context/AuthContext"

export function RequireRole({
  allowed,
}: {
  allowed: CampaignRole[]
}) {
  const {
    user,
    loading,
    hasRole,
  } =
    useAuth()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Checking permissions...
        </p>
      </main>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  const allowedUser =
    allowed.some(
      (role) =>
        hasRole(
          role,
        ),
    )

  if (!allowedUser) {
    return (
      <Navigate
        to="/"
        replace
      />
    )
  }

  return <Outlet />
}