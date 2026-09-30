import {
  useState,
} from "react"

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  Loader2,
  Plus,
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
  useAuth,
} from "@/context/AuthContext"

import {
  createCampaign,
} from "@/services/api"

import type {
  BackendCampaign,
} from "@/types/dashboard"

export function CreateCampaignPage() {
  const navigate =
    useNavigate()

  const {
    user,
  } =
    useAuth()

  const [name, setName] =
    useState("")

  const [
    description,
    setDescription,
  ] =
    useState("")

  const [
    deadline,
    setDeadline,
  ] =
    useState("")

  const [creating, setCreating] =
    useState(false)

  const [error, setError] =
    useState<string | null>(
      null,
    )

  const [
    createdCampaign,
    setCreatedCampaign,
  ] =
    useState<BackendCampaign | null>(
      null,
    )

  const ownerLabel =
    user?.name?.trim() ||
    user?.email ||
    "Signed-in user"

  async function handleCreate() {
    if (!name.trim()) {
      setError(
        "Campaign name is required.",
      )

      return
    }

    try {
      setCreating(true)
      setError(null)

      const result =
        await createCampaign({
          name:
            name.trim(),

          description:
            description.trim() ||
            undefined,

          deadline:
            deadline ||
            null,
        })

      setCreatedCampaign(
        result,
      )
    } catch (err) {
      console.error(
        "Failed to create campaign:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to create campaign.",
      )
    } finally {
      setCreating(false)
    }
  }

  if (createdCampaign) {
    return (
      <div className="mx-auto max-w-[850px] p-6 lg:p-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() =>
            navigate(
              "/campaigns",
            )
          }
        >
          <ArrowLeft className="size-4" />
          Back to campaigns
        </Button>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center sm:p-12">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>

            <h2 className="mt-6 text-2xl font-semibold tracking-tight">
              Campaign created
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              <strong>
                {createdCampaign.name}
              </strong>{" "}
              is ready. You can now create marketing assets inside this campaign.
            </p>

            <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              <ResultItem
                label="Campaign ID"
                value={String(
                  createdCampaign.id,
                )}
              />

              <ResultItem
                label="Owner"
                value={ownerLabel}
              />

              <ResultItem
                label="Deadline"
                value={
                  createdCampaign.deadline
                    ? new Date(
                        createdCampaign.deadline,
                      ).toLocaleDateString()
                    : "No deadline"
                }
              />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  navigate(
                    `/campaigns/${createdCampaign.id}`,
                  )
                }
              >
                Open campaign
              </Button>

              <Button
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
                onClick={() =>
                  navigate(
                    `/assets/new?campaignId=${createdCampaign.id}`,
                  )
                }
              >
                <Plus className="size-4" />
                Create first asset
              </Button>
            </div>
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
        onClick={() =>
          navigate(
            "/campaigns",
          )
        }
      >
        <ArrowLeft className="size-4" />
        Back to campaigns
      </Button>

      <section className="mb-8">
        <p className="mb-1 text-sm font-medium text-blue-600">
          Campaign management
        </p>

        <h2 className="text-3xl font-semibold tracking-tight">
          Create new campaign
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Create a campaign with business context, ownership and a deadline for review prioritization.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div>
              <label
                htmlFor="campaign-name"
                className="text-sm font-semibold"
              >
                Campaign name
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Use a clear business name for the campaign.
              </p>

              <input
                id="campaign-name"
                value={name}
                disabled={creating}
                onChange={(event) => {
                  setName(
                    event.target.value,
                  )
                  setError(null)
                }}
                placeholder="e.g. Summer Campaign 2027"
                className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="campaign-description"
                className="text-sm font-semibold"
              >
                Description
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Optional context about the campaign and its objectives.
              </p>

              <textarea
                id="campaign-description"
                value={description}
                disabled={creating}
                rows={5}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder="Describe the purpose of this campaign..."
                className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-6">
              <label
                htmlFor="campaign-deadline"
                className="text-sm font-semibold"
              >
                Deadline
              </label>

              <p className="mt-1 text-xs text-slate-500">
                Campaigns with earlier deadlines receive higher priority in the Checker review queue.
              </p>

              <div className="relative mt-3">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="campaign-deadline"
                  type="date"
                  value={deadline}
                  disabled={creating}
                  onChange={(event) =>
                    setDeadline(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white">
                  <UserRound className="size-4 text-slate-500" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    Campaign owner
                  </p>

                  <p className="mt-0.5 truncate text-sm font-semibold">
                    {ownerLabel}
                  </p>

                  {user?.name &&
                    user.email && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {user.email}
                      </p>
                    )}
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                The currently authenticated account becomes the owner of this campaign.
              </p>
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
                  !name.trim()
                }
                onClick={handleCreate}
                className="rounded-xl bg-blue-600 px-6 hover:bg-blue-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderKanban className="size-4" />
                    Create campaign
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50">
                <FolderKanban className="size-5 text-blue-600" />
              </div>

              <h3 className="mt-5 font-semibold">
                Campaign structure
              </h3>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold">
                  Campaign
                </p>

                <div className="mt-3 space-y-2 text-xs text-slate-500">
                  <p>↳ Asset</p>
                  <p className="pl-4">↳ Version 1</p>
                  <p className="pl-4">↳ Version 2</p>
                  <p>↳ Another Asset</p>
                </div>
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-400">
                Campaigns organize related marketing assets while each Asset keeps its own immutable version history.
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-blue-900">
                Deadline priority
              </p>

              <p className="mt-2 text-xs leading-5 text-blue-700">
                A nearer campaign deadline moves its IN_REVIEW versions higher in the Checker queue. Campaigns without deadlines remain reviewable but appear after dated work.
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

      <p className="mt-1 break-words font-semibold">
        {value}
      </p>
    </div>
  )
}
