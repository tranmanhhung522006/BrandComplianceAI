import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom"

import {
  useAuth,
} from "@/context/AuthContext"

export function RequireAuth() {
  const {
    user,
    loading,
  } =
    useAuth()

  const location =
    useLocation()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Checking session...
        </p>
      </main>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    )
  }

  return <Outlet />
}