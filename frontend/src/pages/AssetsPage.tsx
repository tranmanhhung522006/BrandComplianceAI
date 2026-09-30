import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowRight,
  FileImage,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react"

import {
  useNavigate,
} from "react-router-dom"

import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  useAuth,
} from "@/context/AuthContext"
import { getLatestVersion } from "@/lib/assets"
import { getAssets } from "@/services/api"

import type {
  BackendAsset,
} from "@/types/dashboard"

export function AssetsPage() {
  const navigate =
    useNavigate()

  const {
    hasRole,
  } =
    useAuth()

  const [assets, setAssets] =
    useState<BackendAsset[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(
      null,
    )

  const canManageAssets =
    hasRole("MAKER")

  const loadAssets =
    useCallback(
      async () => {
        try {
          setLoading(true)
          setError(null)

          const data =
            await getAssets()

          setAssets(data)
        } catch (err) {
          console.error(
            "Failed to load assets:",
            err,
          )

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load assets.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadAssets()
  }, [loadAssets])

  const totalVersions =
    useMemo(() => {
      return assets.reduce(
        (total, asset) =>
          total +
          asset.versions.length,
        0,
      )
    }, [assets])

  const hasData =
    assets.length > 0

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
      <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-600">
            Asset management
          </p>

          <h2 className="text-3xl font-semibold tracking-tight">
            Marketing assets
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Track every asset and version
            throughout the compliance
            workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={loading}
            onClick={() =>
              void loadAssets()
            }
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}

            Refresh
          </Button>

          {canManageAssets && (
            <>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  navigate("/upload")
                }
              >
                <Upload className="size-4" />

                Upload new version
              </Button>

              <Button
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
                onClick={() =>
                  navigate(
                    "/assets/new",
                  )
                }
              >
                <Plus className="size-4" />

                New asset
              </Button>
            </>
          )}
        </div>
      </section>

      {error && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">
              Assets could not be refreshed.
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-fit border-red-200 bg-white text-red-700 hover:bg-red-100"
            disabled={loading}
            onClick={() =>
              void loadAssets()
            }
          >
            <RefreshCw className="size-4" />

            Retry
          </Button>
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50">
              <FileImage className="size-5 text-blue-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Total assets
              </p>

              <p className="text-2xl font-semibold">
                {!hasData &&
                (loading || error)
                  ? "—"
                  : assets.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50">
              <Layers3 className="size-5 text-violet-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Total versions
              </p>

              <p className="text-2xl font-semibold">
                {!hasData &&
                (loading || error)
                  ? "—"
                  : totalVersions}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="font-semibold">
              All assets
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Assets available to your
              signed-in account.
            </p>
          </div>

          {loading &&
            !hasData && (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />

                Loading assets...
              </div>
            )}

          {!loading &&
            error &&
            !hasData && (
              <div className="p-12 text-center">
                <FileImage className="mx-auto size-10 text-red-300" />

                <p className="mt-4 font-medium">
                  Unable to load assets
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Retry the request to load
                  your asset workspace.
                </p>

                <Button
                  variant="outline"
                  className="mt-5 rounded-xl"
                  disabled={loading}
                  onClick={() =>
                    void loadAssets()
                  }
                >
                  <RefreshCw className="size-4" />

                  Retry
                </Button>
              </div>
            )}

          {!loading &&
            !error &&
            assets.length === 0 && (
              <div className="p-12 text-center">
                <FileImage className="mx-auto mb-3 size-10 text-slate-300" />

                <p className="font-medium">
                  No assets yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {canManageAssets
                    ? "Create your first marketing asset to begin."
                    : "No marketing assets are currently available to your account."}
                </p>

                {canManageAssets && (
                  <Button
                    className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700"
                    onClick={() =>
                      navigate(
                        "/assets/new",
                      )
                    }
                  >
                    <Plus className="size-4" />

                    Create asset
                  </Button>
                )}
              </div>
            )}

          {assets.map(
            (asset, index) => {
              const latestVersion =
                getLatestVersion(
                  asset,
                )

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/assets/${asset.id}`,
                    )
                  }
                  className={`flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50 ${
                    index !==
                    assets.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                    <FileImage className="size-5 text-slate-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {asset.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {asset.campaign?.name ??
                        "No campaign"}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Created by{" "}
                      {asset.createdBy
                        ?.name ??
                        "Unknown"}
                    </p>
                  </div>

                  <div className="hidden items-center gap-6 md:flex">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        Latest version
                      </p>

                      <p className="mt-1 text-sm font-medium">
                        {latestVersion
                          ? `v${latestVersion.versionNumber}`
                          : "No versions"}
                      </p>
                    </div>

                    {latestVersion && (
                      <StatusBadge
                        status={
                          latestVersion.status
                        }
                      />
                    )}

                    <ArrowRight className="size-4 text-slate-400" />
                  </div>
                </button>
              )
            },
          )}
        </CardContent>
      </Card>
    </div>
  )
}