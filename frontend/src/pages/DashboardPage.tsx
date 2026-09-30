import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"

import {
  useNavigate,
} from "react-router-dom"

import { MetricCard } from "@/components/dashboard/MetricCard"
import { StatusBadge } from "@/components/dashboard/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  useAuth,
} from "@/context/AuthContext"
import { getAssets } from "@/services/api"
import type {
  BackendAsset,
  BackendAssetVersion,
} from "@/types/dashboard"

function getLatestVersion(
  asset: BackendAsset,
): BackendAssetVersion | null {
  if (
    !asset.versions ||
    asset.versions.length === 0
  ) {
    return null
  }

  return asset.versions.reduce(
    (latest, current) =>
      current.versionNumber >
      latest.versionNumber
        ? current
        : latest,
  )
}

export function DashboardPage() {
  const navigate =
    useNavigate()

  const {
    user,
  } =
    useAuth()

  const [assets, setAssets] =
    useState<BackendAsset[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const loadDashboard =
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
              : "Unable to load dashboard data.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const dashboardAssets =
    useMemo(() => {
      return assets
        .map((asset) => ({
          asset,
          latestVersion:
            getLatestVersion(asset),
        }))
        .sort((a, b) => {
          const aDate =
            a.latestVersion?.updatedAt ??
            a.asset.updatedAt

          const bDate =
            b.latestVersion?.updatedAt ??
            b.asset.updatedAt

          return (
            new Date(bDate).getTime() -
            new Date(aDate).getTime()
          )
        })
    }, [assets])

  const totalVersions =
    useMemo(() => {
      return assets.reduce(
        (total, asset) =>
          total +
          (asset.versions?.length ?? 0),
        0,
      )
    }, [assets])

  const inReview =
    useMemo(() => {
      return dashboardAssets.filter(
        ({ latestVersion }) =>
          latestVersion?.status ===
          "IN_REVIEW",
      ).length
    }, [dashboardAssets])

  const released =
    useMemo(() => {
      return dashboardAssets.filter(
        ({ latestVersion }) =>
          latestVersion?.status ===
          "RELEASED",
      ).length
    }, [dashboardAssets])

  const hasInitialData =
    assets.length > 0

  const metricUnavailable =
    !hasInitialData &&
    (loading || Boolean(error))

  const displayName =
    user?.name?.trim() ||
    user?.email ||
    "there"

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
      <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-600">
            Compliance workspace
          </p>

          <h2 className="text-3xl font-semibold tracking-tight">
            Welcome back, {displayName}.
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Monitor assets, versions and
            compliance workflow activity.
          </p>
        </div>

        <Button
          variant="outline"
          className="w-fit rounded-xl bg-white"
          disabled={loading}
          onClick={() =>
            void loadDashboard()
          }
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}

          Refresh
        </Button>
      </section>

      {error && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">
              Dashboard data could not be refreshed.
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
              void loadDashboard()
            }
          >
            <RefreshCw className="size-4" />

            Retry
          </Button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Assets"
          value={
            metricUnavailable
              ? "—"
              : String(assets.length)
          }
          description="Assets in your workspace"
          icon={FileText}
        />

        <MetricCard
          title="Total Versions"
          value={
            metricUnavailable
              ? "—"
              : String(totalVersions)
          }
          description="Uploaded asset versions"
          icon={Layers3}
        />

        <MetricCard
          title="In Review"
          value={
            metricUnavailable
              ? "—"
              : String(inReview)
          }
          description="Waiting for human review"
          icon={ClipboardCheck}
        />

        <MetricCard
          title="Released"
          value={
            metricUnavailable
              ? "—"
              : String(released)
          }
          description="Latest versions released"
          icon={FileCheck2}
        />
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="font-semibold">
                  Recent assets
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Marketing assets available in
                  your workspace.
                </p>
              </div>

              <Button
                variant="ghost"
                className="text-blue-600"
                onClick={() =>
                  navigate("/assets")
                }
              >
                View all

                <ChevronRight className="size-4" />
              </Button>
            </div>

            {loading &&
              !hasInitialData && (
                <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin" />

                  Loading assets...
                </div>
              )}

            {!loading &&
              !error &&
              dashboardAssets.length ===
                0 && (
                <div className="px-6 py-12 text-center">
                  <FileText className="mx-auto mb-3 size-9 text-slate-300" />

                  <p className="text-sm font-medium">
                    No assets yet
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Create a marketing asset to
                    begin the compliance workflow.
                  </p>

                  <Button
                    variant="outline"
                    className="mt-5 rounded-xl"
                    onClick={() =>
                      navigate("/assets")
                    }
                  >
                    Open assets
                  </Button>
                </div>
              )}

            {!loading &&
              error &&
              !hasInitialData && (
                <div className="px-6 py-12 text-center">
                  <ShieldCheck className="mx-auto size-9 text-red-300" />

                  <p className="mt-4 text-sm font-medium">
                    Unable to load recent assets
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Retry the request to restore
                    dashboard data.
                  </p>

                  <Button
                    variant="outline"
                    className="mt-5 rounded-xl"
                    disabled={loading}
                    onClick={() =>
                      void loadDashboard()
                    }
                  >
                    <RefreshCw className="size-4" />

                    Retry
                  </Button>
                </div>
              )}

            {dashboardAssets.map(
              (
                {
                  asset,
                  latestVersion,
                },
                index,
              ) => (
                <div
                  key={asset.id}
                  className={`flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50/70 md:flex-row md:items-center ${
                    index !==
                    dashboardAssets.length -
                      1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                      <FileText className="size-5 text-slate-500" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {asset.name}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {asset.campaign?.name ??
                          "No campaign"}

                        {latestVersion &&
                          ` · v${latestVersion.versionNumber}`}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-400">
                        Created by{" "}
                        {asset.createdBy
                          ?.name ??
                          "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 md:justify-end">
                    {latestVersion ? (
                      <StatusBadge
                        status={
                          latestVersion.status
                        }
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        No version
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      aria-label={`Open ${asset.name}`}
                      onClick={() =>
                        navigate(
                          `/assets/${asset.id}`,
                        )
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ),
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    Workflow status
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Based on latest versions.
                  </p>
                </div>

                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50">
                  <ShieldCheck className="size-5 text-blue-600" />
                </div>
              </div>

              {metricUnavailable ? (
                <div className="py-4 text-center text-sm text-slate-500">
                  {loading
                    ? "Loading workflow status..."
                    : "Workflow status is unavailable."}
                </div>
              ) : (
                <div className="space-y-4">
                  <WorkflowRow
                    label="Total assets"
                    value={
                      assets.length
                    }
                  />

                  <WorkflowRow
                    label="Total versions"
                    value={
                      totalVersions
                    }
                  />

                  <WorkflowRow
                    label="In review"
                    value={inReview}
                  />

                  <WorkflowRow
                    label="Released"
                    value={released}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-slate-950 text-white shadow-sm">
            <CardContent className="p-6">
              <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-white/10">
                <ShieldCheck className="size-5" />
              </div>

              <h3 className="text-lg font-semibold">
                AI compliance engine
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Asset versions are evaluated by
                the AI engine before human
                review and final release.
              </p>

              <Button
                className="mt-5 w-full rounded-xl bg-white text-slate-950 hover:bg-slate-100"
                onClick={() =>
                  navigate("/assets")
                }
              >
                View assets
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function WorkflowRow({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-semibold">
        {value}
      </span>
    </div>
  )
}