import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowRight,
  CalendarDays,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react"

import {
  useNavigate,
} from "react-router-dom"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  getAssets,
  getCampaigns,
} from "@/services/api"

import type {
  BackendAsset,
  BackendCampaign,
} from "@/types/dashboard"

export function CampaignsPage() {
  const navigate =
    useNavigate()

  const [campaigns, setCampaigns] =
    useState<BackendCampaign[]>([])

  const [assets, setAssets] =
    useState<BackendAsset[]>([])

  const [loading, setLoading] =
    useState(true)

  const [hasLoadedOnce, setHasLoadedOnce] =
    useState(false)

  const [error, setError] =
    useState<string | null>(
      null,
    )

  const loadCampaigns =
    useCallback(
      async () => {
        try {
          setLoading(true)
          setError(null)

          const [
            campaignData,
            assetData,
          ] =
            await Promise.all([
              getCampaigns(),
              getAssets(),
            ])

          setCampaigns(
            campaignData,
          )

          setAssets(
            assetData,
          )

          setHasLoadedOnce(
            true,
          )
        } catch (err) {
          console.error(
            "Failed to load campaigns:",
            err,
          )

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load campaigns.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadCampaigns()
  }, [
    loadCampaigns,
  ])

  const totalAssets =
    assets.length

  const campaignsWithAssets =
    useMemo(() => {
      return campaigns.map(
        (campaign) => {
          const campaignAssets =
            assets.filter(
              (asset) =>
                asset.campaignId ===
                campaign.id,
            )

          return {
            campaign,
            assetCount:
              campaignAssets.length,
          }
        },
      )
    }, [
      campaigns,
      assets,
    ])

  const metricsUnavailable =
    !hasLoadedOnce &&
    (loading || Boolean(error))

  function formatDeadline(
    deadline?: string | null,
  ) {
    if (!deadline) {
      return "No deadline"
    }

    const date =
      new Date(
        deadline,
      )

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "Invalid date"
    }

    return date.toLocaleDateString()
  }

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
      <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-600">
            Campaign management
          </p>

          <h2 className="text-3xl font-semibold tracking-tight">
            Campaigns
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Organize marketing assets
            into campaigns and monitor
            their compliance workflow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={loading}
            onClick={() =>
              void loadCampaigns()
            }
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}

            Refresh
          </Button>

          <Button
            className="w-fit rounded-xl bg-blue-600 hover:bg-blue-700"
            onClick={() =>
              navigate(
                "/campaigns/new",
              )
            }
          >
            <Plus className="size-4" />

            New campaign
          </Button>
        </div>
      </section>

      {error && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-700">
              Campaign data could not be refreshed.
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
              void loadCampaigns()
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
              <FolderKanban className="size-5 text-blue-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Total campaigns
              </p>

              <p className="text-2xl font-semibold">
                {metricsUnavailable
                  ? "—"
                  : campaigns.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50">
              <FolderKanban className="size-5 text-violet-600" />
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Assets across campaigns
              </p>

              <p className="text-2xl font-semibold">
                {metricsUnavailable
                  ? "—"
                  : totalAssets}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="font-semibold">
              All campaigns
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Campaigns available to your
              signed-in account.
            </p>
          </div>

          {loading &&
            !hasLoadedOnce && (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />

                Loading campaigns...
              </div>
            )}

          {!loading &&
            error &&
            !hasLoadedOnce && (
              <div className="p-14 text-center">
                <FolderKanban className="mx-auto size-10 text-red-300" />

                <p className="mt-4 font-medium">
                  Unable to load campaigns
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Retry the request to restore
                  your campaign workspace.
                </p>

                <Button
                  variant="outline"
                  className="mt-5 rounded-xl"
                  disabled={loading}
                  onClick={() =>
                    void loadCampaigns()
                  }
                >
                  <RefreshCw className="size-4" />

                  Retry
                </Button>
              </div>
            )}

          {!loading &&
            !error &&
            hasLoadedOnce &&
            campaignsWithAssets.length ===
              0 && (
              <div className="p-14 text-center">
                <FolderKanban className="mx-auto size-10 text-slate-300" />

                <p className="mt-4 font-medium">
                  No campaigns yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Create your first
                  campaign to begin
                  organizing marketing
                  assets.
                </p>

                <Button
                  className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700"
                  onClick={() =>
                    navigate(
                      "/campaigns/new",
                    )
                  }
                >
                  <Plus className="size-4" />

                  Create campaign
                </Button>
              </div>
            )}

          {campaignsWithAssets.map(
            (
              {
                campaign,
                assetCount,
              },
              index,
            ) => (
              <button
                key={
                  campaign.id
                }
                type="button"
                onClick={() =>
                  navigate(
                    `/campaigns/${campaign.id}`,
                  )
                }
                className={`flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50 ${
                  index !==
                  campaignsWithAssets.length -
                    1
                    ? "border-b border-slate-100"
                    : ""
                }`}
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <FolderKanban className="size-5 text-blue-600" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {
                      campaign.name
                    }
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {campaign.description ??
                      "No description"}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 md:hidden">
                    <span>
                      {assetCount}{" "}
                      {assetCount === 1
                        ? "asset"
                        : "assets"}
                    </span>

                    <span>
                      {formatDeadline(
                        campaign.deadline,
                      )}
                    </span>
                  </div>
                </div>

                <div className="hidden items-center gap-8 md:flex">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">
                      Assets
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {
                        assetCount
                      }
                    </p>
                  </div>

                  <div className="w-[150px] text-right">
                    <div className="flex items-center justify-end gap-1 text-xs text-slate-400">
                      <CalendarDays className="size-3.5" />

                      Deadline
                    </div>

                    <p className="mt-1 text-sm font-medium">
                      {formatDeadline(
                        campaign.deadline,
                      )}
                    </p>
                  </div>

                  <div className="w-[140px] text-right">
                    <div className="flex items-center justify-end gap-1 text-xs text-slate-400">
                      <UserRound className="size-3.5" />

                      Owner
                    </div>

                    <p className="mt-1 truncate text-sm font-medium">
                      {campaign.owner
                        ?.name ??
                        campaign.owner
                          ?.email ??
                        `User ${campaign.ownerId}`}
                    </p>
                  </div>

                  <ArrowRight className="size-4 text-slate-400" />
                </div>

                <ArrowRight className="size-4 shrink-0 text-slate-400 md:hidden" />
              </button>
            ),
          )}
        </CardContent>
      </Card>
    </div>
  )
}