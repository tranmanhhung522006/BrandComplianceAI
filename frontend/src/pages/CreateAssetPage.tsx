import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FilePlus2,
  Loader2,
} from "lucide-react"

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  createAsset,
  getCampaigns,
} from "@/services/api"

import type {
  BackendAsset,
  BackendCampaign,
} from "@/types/dashboard"

export function CreateAssetPage() {
  const navigate =
    useNavigate()

  const [searchParams] =
    useSearchParams()

  const requestedCampaignId =
    searchParams.get("campaignId")

  const [campaigns, setCampaigns] =
    useState<BackendCampaign[]>([])

  const [name, setName] =
    useState("")

  const [
    description,
    setDescription,
  ] =
    useState("")

  const [
    campaignId,
    setCampaignId,
  ] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const [creating, setCreating] =
    useState(false)

  const [error, setError] =
    useState<string | null>(
      null,
    )

  const [
    createdAsset,
    setCreatedAsset,
  ] =
    useState<BackendAsset | null>(
      null,
    )

  useEffect(() => {
    async function loadCampaigns() {
      try {
        setLoading(true)

        const data =
          await getCampaigns()

        setCampaigns(data)

        if (requestedCampaignId) {
          const requestedCampaign =
            data.find(
              (campaign) =>
                campaign.id ===
                Number(
                  requestedCampaignId,
                ),
            )

          if (requestedCampaign) {
            setCampaignId(
              String(
                requestedCampaign.id,
              ),
            )
          }
        } else if (
          data.length === 1
        ) {
          setCampaignId(
            String(
              data[0].id,
            ),
          )
        }

        setError(null)
      } catch (err) {
        console.error(
          "Failed to load campaigns:",
          err,
        )

        setError(
          "Unable to load campaigns.",
        )
      } finally {
        setLoading(false)
      }
    }

    void loadCampaigns()
  }, [requestedCampaignId])

  const selectedCampaign =
    useMemo(() => {
      return campaigns.find(
        (campaign) =>
          campaign.id ===
          Number(
            campaignId,
          ),
      )
    }, [
      campaigns,
      campaignId,
    ])

  async function handleCreate() {
    if (!name.trim()) {
      setError(
        "Asset name is required.",
      )

      return
    }

    if (!campaignId) {
      setError(
        "Please select a campaign.",
      )

      return
    }

    try {
      setCreating(true)

      setError(null)

      const result =
        await createAsset({
          name: name.trim(),

          description:
            description.trim() ||
            undefined,

          campaignId:
            Number(
              campaignId,
            ),
        })

      setCreatedAsset(
        result,
      )
    } catch (err) {
      console.error(
        "Failed to create asset:",
        err,
      )

      if (
        err instanceof Error
      ) {
        setError(
          err.message,
        )
      } else {
        setError(
          "Unable to create asset.",
        )
      }
    } finally {
      setCreating(false)
    }
  }

  if (createdAsset) {
    return (
      <div className="mx-auto max-w-[850px] p-6 lg:p-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() =>
            navigate(
              "/assets",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Back to assets
        </Button>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center sm:p-12">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Asset created
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              <strong>
                {createdAsset.name}
              </strong>{" "}
              has been created inside{" "}
              <strong>
                {selectedCampaign?.name ??
                  "the selected campaign"}
              </strong>
              . You can now upload its
              first artwork version.
            </p>

            <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              <ResultItem
                label="Asset ID"
                value={String(
                  createdAsset.id,
                )}
              />

              <ResultItem
                label="Campaign ID"
                value={String(
                  createdAsset.campaignId,
                )}
              />

              <ResultItem
                label="Versions"
                value="0"
              />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  navigate(
                    "/assets",
                  )
                }
              >
                View all assets
              </Button>

              <Button
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
                onClick={() =>
                  navigate(
                    `/upload?assetId=${createdAsset.id}`,
                  )
                }
              >
                Upload first artwork
              </Button>
            </div>

            <p className="mt-6 text-xs text-slate-400">
              The first upload becomes
              Version 1. Future revisions
              will create Version 2,
              Version 3 and so on.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1000px] p-6 lg:p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => {
          if (requestedCampaignId) {
            navigate(
              "/campaigns",
            )
          } else {
            navigate(
              "/assets",
            )
          }
        }}
      >
        <ArrowLeft className="size-4" />

        Back
      </Button>

      <section className="mb-8">
        <p className="mb-1 text-sm font-medium text-blue-600">
          Maker workspace
        </p>

        <h2 className="text-3xl font-semibold tracking-tight">
          Create new asset
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Create a marketing asset inside
          a campaign. Artwork uploads will
          be stored as immutable versions
          under this asset.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div>
              <label
                htmlFor="asset-name"
                className="text-sm font-semibold"
              >
                Asset name
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Give the marketing item
                a clear business name.
              </p>

              <input
                id="asset-name"
                value={name}
                disabled={creating}
                onChange={(event) => {
                  setName(
                    event.target.value,
                  )

                  setError(null)
                }}
                placeholder="e.g. Summer Facebook Banner"
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="campaign"
                className="text-sm font-semibold"
              >
                Campaign
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Select the campaign this
                asset belongs to.
              </p>

              <select
                id="campaign"
                value={
                  campaignId
                }
                disabled={
                  loading ||
                  creating
                }
                onChange={(event) => {
                  setCampaignId(
                    event.target.value,
                  )

                  setError(null)
                }}
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">
                  {loading
                    ? "Loading campaigns..."
                    : "Select campaign"}
                </option>

                {campaigns.map(
                  (campaign) => (
                    <option
                      key={
                        campaign.id
                      }
                      value={
                        campaign.id
                      }
                    >
                      {
                        campaign.name
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="mt-6">
              <label
                htmlFor="asset-description"
                className="text-sm font-semibold"
              >
                Description
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Optional context for
                Checkers and Admins.
              </p>

              <textarea
                id="asset-description"
                value={
                  description
                }
                disabled={
                  creating
                }
                rows={5}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="Describe the purpose of this marketing asset..."
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button
                size="lg"
                disabled={
                  creating ||
                  loading ||
                  !name.trim() ||
                  !campaignId
                }
                onClick={
                  handleCreate
                }
                className="rounded-xl bg-blue-600 px-6 hover:bg-blue-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />

                    Creating...
                  </>
                ) : (
                  <>
                    <FilePlus2 className="size-4" />

                    Create asset
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedCampaign && (
            <Card className="border-slate-200 bg-slate-950 text-white shadow-sm">
              <CardContent className="p-6">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Selected campaign
                </p>

                <p className="mt-3 font-semibold">
                  {
                    selectedCampaign.name
                  }
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {selectedCampaign.description ??
                    "No campaign description."}
                </p>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs text-slate-500">
                    Owner
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {selectedCampaign.owner
                      ?.name ??
                      `User ${selectedCampaign.ownerId}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {requestedCampaignId &&
            selectedCampaign && (
              <Card className="border-blue-200 bg-blue-50 shadow-none">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-blue-900">
                    Campaign selected
                    automatically
                  </p>

                  <p className="mt-2 text-xs leading-5 text-blue-700">
                    You came here from
                    the Campaign workflow.
                    This Asset will be
                    created inside{" "}
                    <strong>
                      {
                        selectedCampaign.name
                      }
                    </strong>
                    .
                  </p>
                </CardContent>
              </Card>
            )}

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50">
                <BriefcaseBusiness className="size-5 text-blue-600" />
              </div>

              <h3 className="mt-5 font-semibold">
                How versioning works
              </h3>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold">
                  Marketing Asset
                </p>

                <div className="mt-3 space-y-2 text-xs text-slate-500">
                  <p>
                    ↳ Version 1
                  </p>

                  <p>
                    ↳ Version 2
                  </p>

                  <p>
                    ↳ Version 3
                  </p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-400">
                Existing versions are
                never overwritten.
                Revisions create a new
                version and preserve the
                full audit history.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ResultItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>
    </div>
  )
}