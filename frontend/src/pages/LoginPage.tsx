import {
  type FormEvent,
  useState,
} from "react"

import {
  ShieldCheck,
} from "lucide-react"

import {
  Navigate,
  useLocation,
} from "react-router-dom"

import {
  Button,
} from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  useAuth,
} from "@/context/AuthContext"

export function LoginPage() {
  const location =
    useLocation()

  const {
    user,
    loading,
    login,
  } =
    useAuth()

  const [email, setEmail] =
    useState("")

  const [
    password,
    setPassword,
  ] =
    useState("")

  const [error, setError] =
    useState<string | null>(
      null,
    )

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false)

  const state =
    location.state as
      | {
          from?: string
        }
      | null

  const destination =
    state?.from ?? "/"

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault()

    setError(null)
    setSubmitting(true)

    try {
      await login(
        email,
        password,
      )
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          Checking session...
        </p>
      </main>
    )
  }

  if (user) {
    return (
      <Navigate
        to={destination}
        replace
      />
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="p-7">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600">
            <ShieldCheck className="size-6 text-white" />
          </div>

          <p className="mt-5 text-sm font-medium text-blue-600">
            Brand Compliance AI
          </p>

          <h1 className="mt-2 text-3xl font-semibold">
            Sign in
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Use your Brand Compliance
            account.
          </p>

          <form
            className="mt-7 space-y-5"
            onSubmit={
              handleSubmit
            }
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                required
                autoComplete="email"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                required
                autoComplete="current-password"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={
                submitting
              }
              className="w-full"
            >
              {submitting
                ? "Signing in..."
                : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}