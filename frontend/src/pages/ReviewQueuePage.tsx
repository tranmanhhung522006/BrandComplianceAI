import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowRight,
  Bot,
  CalendarDays,
  ClipboardCheck,
  FileImage,
  Loader2,
  RefreshCw,
  ShieldAlert,
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
  getReviewQueue,
} from "@/services/api"

import type {
  ReviewQueueVersion,
} from "@/types/dashboard"

function getAverageScore(
  version: ReviewQueueVersion,
) {
  if (
    version.aiCheckResults.length === 0
  ) {
    return null
  }

  const total =
    version.aiCheckResults.reduce(
      (sum, result) =>
        sum + result.score,
      0,
    )

  return Math.round(
    total /
      version.aiCheckResults.length,
  )
}

function getDeadlineTime(
  version: ReviewQueueVersion,
) {
  const deadline =
    version.asset.campaign.deadline

  if (!deadline) {
    return Number.POSITIVE_INFINITY
  }

  const time =
    new Date(deadline).getTime()

  return Number.isNaN(time)
    ? Number.POSITIVE_INFINITY
    : time
}

function getDeadlineInfo(
  deadline?: string | null,
) {
  if (!deadline) {
    return {
      dateLabel: "No deadline",
      priorityLabel: "Normal",
      className:
        "bg-slate-100 text-slate-600",
    }
  }

  const date =
    new Date(deadline)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return {
      dateLabel: "Invalid date",
      priorityLabel: "Normal",
      className:
        "bg-slate-100 text-slate-600",
    }
  }

  const now =
    new Date()

  const todayStart =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime()

  const deadlineStart =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    ).getTime()

  const days =
    Math.ceil(
      (deadlineStart - todayStart) /
        86_400_000,
    )

  if (days < 0) {
    return {
      dateLabel:
        date.toLocaleDateString(),
      priorityLabel:
        "Overdue",
      className:
        "bg-red-50 text-red-700",
    }
  }

  if (days <= 3) {
    return {
      dateLabel:
        date.toLocaleDateString(),
      priorityLabel:
        "High priority",
      className:
        "bg-amber-50 text-amber-700",
    }
  }

  if (days <= 7) {
    return {
      dateLabel:
        date.toLocaleDateString(),
      priorityLabel:
        "Due soon",
      className:
        "bg-blue-50 text-blue-700",
    }
  }

  return {
    dateLabel:
      date.toLocaleDateString(),
    priorityLabel:
      "Scheduled",
    className:
      "bg-slate-100 text-slate-600",
  }
}

export function ReviewQueuePage() {
  const navigate =
    useNavigate()

  const [versions, setVersions] =
    useState<ReviewQueueVersion[]>([])

  const [loading, setLoading] =
    useState(true)

  const [hasLoadedOnce, setHasLoadedOnce] =
    useState(false)

  const [error, setError] =
    useState<string | null>(
      null,
    )

  const loadQueue =
    useCallback(
      async () => {
        try {
          setLoading(true)
          setError(null)

          const data =
            await getReviewQueue()

          setVersions(data)
          setHasLoadedOnce(true)
        } catch (err) {
          console.error(
            "Failed to load review queue:",
            err,
          )

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load review queue.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  const orderedVersions =
    useMemo(() => {
      return [...versions].sort(
        (a, b) => {
          const deadlineDifference =
            getDeadlineTime(a) -
            getDeadlineTime(b)

          if (
            Number.isFinite(
              deadlineDifference,
            ) &&
            deadlineDifference !== 0
          ) {
            return deadlineDifference
          }

          if (
            getDeadlineTime(a) !==
            getDeadlineTime(b)
          ) {
            return getDeadlineTime(a) <
              getDeadlineTime(b)
              ? -1
              : 1
          }

          return (
            new Date(
              a.createdAt,
            ).getTime() -
            new Date(
              b.createdAt,
            ).getTime()
          )
        },
      )
    }, [versions])

  const humanReviewCount =
    useMemo(() => {
      return versions.filter(
        (version) =>
          version.aiCheckResults.some(
            (result) =>
              result.score >= 31 &&
              result.score <= 70,
          ),
      ).length
    }, [versions])

  const totalAiChecks =
    useMemo(() => {
      return versions.reduce(
        (total, version) =>
          total +
          version.aiCheckResults.length,
        0,
      )
    }, [versions])

  const deadlineCount =
    useMemo(() => {
      return versions.filter(
        (version) =>
          Boolean(
            version.asset.campaign.deadline,
          ),
      ).length
    }, [versions])

  const metricsUnavailable =
    !hasLoadedOnce &&
    (loading || Boolean(error))

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
      <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-600">
            Checker workspace
          </p>

          <h2 className="text-3xl font-semibold tracking-tight">
            Review queue
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Versions are prioritized by campaign deadline. Earlier deadlines appear first; campaigns without a deadline appear after dated work.
          </p>
        </div>

        <Button
          variant="outline"
          className="w-fit rounded-xl"
          disabled={loading}
          onClick={() =>
            void loadQueue()
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
              Review queue could not be refreshed.
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
              void loadQueue()
            }
          >
            <RefreshCw className="size-4" />
            Retry
          </Button>
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Waiting for review"
          value={
            metricsUnavailable
              ? "—"
              : versions.length
          }
          icon={ClipboardCheck}
        />

        <SummaryCard
          title="With deadline"
          value={
            metricsUnavailable
              ? "—"
              : deadlineCount
          }
          icon={CalendarDays}
        />

        <SummaryCard
          title="Human review flags"
          value={
            metricsUnavailable
              ? "—"
              : humanReviewCount
          }
          icon={ShieldAlert}
        />

        <SummaryCard
          title="AI checks"
          value={
            metricsUnavailable
              ? "—"
              : totalAiChecks
          }
          icon={Bot}
        />
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-6 py-5">
            <h3 className="font-semibold">
              Versions awaiting review
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Deadline priority first, then oldest waiting version first.
            </p>
          </div>

          {loading &&
            !hasLoadedOnce && (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                Loading review queue...
              </div>
            )}

          {!loading &&
            error &&
            !hasLoadedOnce && (
              <div className="p-14 text-center">
                <ShieldAlert className="mx-auto size-10 text-red-300" />

                <p className="mt-4 font-medium">
                  Unable to load review queue
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Retry to retrieve versions waiting for Checker review.
                </p>
              </div>
            )}

          {!loading &&
            !error &&
            hasLoadedOnce &&
            orderedVersions.length ===
              0 && (
              <div className="p-14 text-center">
                <ClipboardCheck className="mx-auto size-10 text-slate-300" />

                <p className="mt-4 font-medium">
                  Review queue is clear
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  There are no versions waiting for Checker review.
                </p>
              </div>
            )}

          {orderedVersions.map(
            (version, index) => {
              const average =
                getAverageScore(
                  version,
                )

              const deadlineInfo =
                getDeadlineInfo(
                  version.asset.campaign.deadline,
                )

              return (
                <button
                  key={version.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/reviews/${version.id}`,
                    )
                  }
                  className={`flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50 ${
                    index !==
                    orderedVersions.length - 1
                      ? "border-b border-slate-100"
                      : ""
                  }`}
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                    <FileImage className="size-5 text-slate-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {version.asset.name}
                      </p>

                      <span className="shrink-0 text-xs text-slate-400">
                        v{version.versionNumber}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${deadlineInfo.className}`}
                      >
                        {deadlineInfo.priorityLabel}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {version.fileName}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Campaign: {version.asset.campaign.name}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {deadlineInfo.dateLabel}
                      </span>

                      <span>
                        Version ID {version.id}
                      </span>

                      <span>
                        {version.aiCheckResults.length} AI checks
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3 md:hidden">
                      <span className="text-xs font-medium text-slate-600">
                        AI average:{" "}
                        {average !== null
                          ? `${average}/100`
                          : "—"}
                      </span>

                      <StatusBadge
                        status={version.status}
                      />
                    </div>
                  </div>

                  <div className="hidden items-center gap-7 md:flex">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        AI average
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {average !== null
                          ? `${average}/100`
                          : "—"}
                      </p>
                    </div>

                    <StatusBadge
                      status={version.status}
                    />

                    <ArrowRight className="size-4 text-slate-400" />
                  </div>

                  <ArrowRight className="size-4 shrink-0 text-slate-400 md:hidden" />
                </button>
              )
            },
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number | string
  icon: typeof ClipboardCheck
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50">
          <Icon className="size-5 text-blue-600" />
        </div>

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-1 text-2xl font-semibold">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
