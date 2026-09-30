import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileClock,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  getAuditLogs,
  type AuditLogRecord,
} from "@/services/api"

function getString(
  record: AuditLogRecord,
  keys: string[],
) {
  for (const key of keys) {
    const value =
      record[key]

    if (
      typeof value ===
      "string"
    ) {
      return value
    }

    if (
      typeof value ===
      "number"
    ) {
      return String(
        value,
      )
    }
  }

  return null
}

function getId(
  record: AuditLogRecord,
) {
  const value =
    record.id

  if (
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return String(
      value,
    )
  }

  return "—"
}

function getAction(
  record: AuditLogRecord,
) {
  return (
    getString(
      record,
      [
        "action",
        "event",
        "eventType",
        "activity",
      ],
    ) ??
    "UNKNOWN_ACTION"
  )
}

function getEntityType(
  record: AuditLogRecord,
) {
  return (
    getString(
      record,
      [
        "entityType",
        "entity",
        "resourceType",
      ],
    ) ??
    "Unknown"
  )
}

function getEntityId(
  record: AuditLogRecord,
) {
  return (
    getString(
      record,
      [
        "entityId",
        "resourceId",
        "targetId",
      ],
    ) ??
    "—"
  )
}

function getCreatedAt(
  record: AuditLogRecord,
) {
  return getString(
    record,
    [
      "createdAt",
      "timestamp",
      "occurredAt",
    ],
  )
}

function getActorName(
  record: AuditLogRecord,
) {
  const actorCandidates =
    [
      record.actor,
      record.user,
      record.performedBy,
    ]

  for (
    const actor of
    actorCandidates
  ) {
    if (
      actor &&
      typeof actor ===
        "object" &&
      !Array.isArray(
        actor,
      )
    ) {
      const actorObject =
        actor as Record<
          string,
          unknown
        >

      const name =
        actorObject.name

      if (
        typeof name ===
        "string" &&
        name.trim()
      ) {
        return name
      }

      const email =
        actorObject.email

      if (
        typeof email ===
        "string" &&
        email.trim()
      ) {
        return email
      }
    }
  }

  const actorId =
    getString(
      record,
      [
        "actorId",
        "userId",
        "performedById",
      ],
    )

  if (actorId) {
    return `User ${actorId}`
  }

  return "System"
}

function getDetails(
  record: AuditLogRecord,
) {
  const keys =
    [
      "details",
      "metadata",
      "payload",
      "data",
      "changes",
    ]

  for (
    const key of keys
  ) {
    if (
      record[key] !==
        undefined &&
      record[key] !==
        null
    ) {
      return record[
        key
      ]
    }
  }

  return null
}

function formatAction(
  action: string,
) {
  return action
    .replaceAll(
      "_",
      " ",
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character.toUpperCase(),
    )
}

function formatDate(
  value: string | null,
) {
  if (!value) {
    return "Unknown time"
  }

  const date =
    new Date(
      value,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString()
}

export function AuditLogPage() {
  const [logs, setLogs] =
    useState<
      AuditLogRecord[]
    >([])

  const [loading, setLoading] =
    useState(true)

  const [
    hasLoadedOnce,
    setHasLoadedOnce,
  ] =
    useState(false)

  const [error, setError] =
    useState<
      string | null
    >(null)

  const [
    search,
    setSearch,
  ] =
    useState("")

  const [
    expandedLogId,
    setExpandedLogId,
  ] =
    useState<
      string | null
    >(null)

  const loadLogs =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          )

          setError(
            null,
          )

          const data =
            await getAuditLogs()

          setLogs(
            data,
          )

          setHasLoadedOnce(
            true,
          )
        } catch (err) {
          console.error(
            "Failed to load audit logs:",
            err,
          )

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load audit logs.",
          )
        } finally {
          setLoading(
            false,
          )
        }
      },
      [],
    )

  useEffect(() => {
    void loadLogs()
  }, [
    loadLogs,
  ])

  const sortedLogs =
    useMemo(
      () => {
        return [
          ...logs,
        ].sort(
          (
            a,
            b,
          ) => {
            const aDate =
              getCreatedAt(
                a,
              )

            const bDate =
              getCreatedAt(
                b,
              )

            const aTime =
              aDate
                ? new Date(
                    aDate,
                  ).getTime()
                : 0

            const bTime =
              bDate
                ? new Date(
                    bDate,
                  ).getTime()
                : 0

            const safeATime =
              Number.isNaN(
                aTime,
              )
                ? 0
                : aTime

            const safeBTime =
              Number.isNaN(
                bTime,
              )
                ? 0
                : bTime

            return (
              safeBTime -
              safeATime
            )
          },
        )
      },
      [
        logs,
      ],
    )

  const filteredLogs =
    useMemo(
      () => {
        const keyword =
          search
            .trim()
            .toLowerCase()

        if (!keyword) {
          return sortedLogs
        }

        return sortedLogs.filter(
          (
            log,
          ) => {
            const searchable =
              [
                getId(
                  log,
                ),
                getAction(
                  log,
                ),
                getEntityType(
                  log,
                ),
                getEntityId(
                  log,
                ),
                getActorName(
                  log,
                ),
                formatDate(
                  getCreatedAt(
                    log,
                  ),
                ),
              ]
                .join(
                  " ",
                )
                .toLowerCase()

            return searchable.includes(
              keyword,
            )
          },
        )
      },
      [
        search,
        sortedLogs,
      ],
    )

  const entityTypes =
    useMemo(
      () => {
        return new Set(
          logs.map(
            (
              log,
            ) =>
              getEntityType(
                log,
              ),
          ),
        ).size
      },
      [
        logs,
      ],
    )

  const metricsUnavailable =
    !hasLoadedOnce &&
    (
      loading ||
      Boolean(
        error,
      )
    )

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
      <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-600">
            Audit workspace
          </p>

          <h2 className="text-3xl font-semibold tracking-tight">
            Audit log
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Trace important
            actions across assets,
            versions, AI scoring,
            reviews, releases and
            compliance
            administration.
          </p>
        </div>

        <Button
          variant="outline"
          className="w-fit rounded-xl"
          disabled={
            loading
          }
          onClick={() =>
            void loadLogs()
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
              Audit history could
              not be refreshed.
            </p>

            <p className="mt-1 text-xs text-red-600">
              {error}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-fit border-red-200 bg-white text-red-700 hover:bg-red-100"
            disabled={
              loading
            }
            onClick={() =>
              void loadLogs()
            }
          >
            <RefreshCw className="size-4" />

            Retry
          </Button>
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Audit events"
          value={
            metricsUnavailable
              ? "—"
              : logs.length
          }
          icon={
            FileClock
          }
        />

        <SummaryCard
          title="Entity types"
          value={
            metricsUnavailable
              ? "—"
              : entityTypes
          }
          icon={
            ShieldCheck
          }
        />

        <SummaryCard
          title="Visible events"
          value={
            metricsUnavailable
              ? "—"
              : filteredLogs.length
          }
          icon={
            Activity
          }
        />
      </section>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">
                Activity history
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Audit records are
                shown newest first.
              </p>
            </div>

            <div className="relative w-full md:w-[320px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

              <Input
                value={
                  search
                }
                disabled={
                  !hasLoadedOnce &&
                  loading
                }
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Search action, entity, actor..."
                className="rounded-xl pl-9"
              />
            </div>
          </div>

          {loading &&
            !hasLoadedOnce && (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />

                Loading audit
                logs...
              </div>
            )}

          {!loading &&
            error &&
            !hasLoadedOnce && (
              <div className="p-14 text-center">
                <FileClock className="mx-auto size-11 text-red-300" />

                <p className="mt-4 font-medium">
                  Unable to load
                  audit history
                </p>

                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Retry the request
                  to retrieve audit
                  records.
                </p>

                <Button
                  variant="outline"
                  className="mt-5 rounded-xl"
                  disabled={
                    loading
                  }
                  onClick={() =>
                    void loadLogs()
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
            logs.length ===
              0 && (
              <div className="p-14 text-center">
                <FileClock className="mx-auto size-11 text-slate-300" />

                <p className="mt-4 font-medium">
                  No audit events
                  yet
                </p>

                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  Workflow activity
                  will appear here
                  as the system
                  records actions.
                </p>
              </div>
            )}

          {hasLoadedOnce &&
            logs.length > 0 &&
            filteredLogs.length ===
              0 && (
              <div className="p-14 text-center">
                <Search className="mx-auto size-10 text-slate-300" />

                <p className="mt-4 font-medium">
                  No matching audit
                  events
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try another
                  search term.
                </p>

                <Button
                  variant="outline"
                  className="mt-5 rounded-xl"
                  onClick={() =>
                    setSearch(
                      "",
                    )
                  }
                >
                  Clear search
                </Button>
              </div>
            )}

          {filteredLogs.map(
            (
              log,
              index,
            ) => {
              const id =
                getId(
                  log,
                )

              const uniqueKey =
                `${id}-${index}`

              const action =
                getAction(
                  log,
                )

              const entityType =
                getEntityType(
                  log,
                )

              const entityId =
                getEntityId(
                  log,
                )

              const actor =
                getActorName(
                  log,
                )

              const createdAt =
                getCreatedAt(
                  log,
                )

              const details =
                getDetails(
                  log,
                )

              const expanded =
                expandedLogId ===
                uniqueKey

              return (
                <div
                  key={
                    uniqueKey
                  }
                  className={
                    index !==
                    filteredLogs.length -
                      1
                      ? "border-b border-slate-100"
                      : ""
                  }
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-4 px-6 py-5 text-left transition hover:bg-slate-50"
                    onClick={() =>
                      setExpandedLogId(
                        expanded
                          ? null
                          : uniqueKey,
                      )
                    }
                  >
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                      <Activity className="size-5 text-blue-600" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                          {formatAction(
                            action,
                          )}
                        </p>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                          {
                            entityType
                          }
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span>
                          Entity ID:{" "}
                          <strong className="font-medium text-slate-700">
                            {
                              entityId
                            }
                          </strong>
                        </span>

                        <span className="flex items-center gap-1">
                          <UserRound className="size-3.5" />

                          {
                            actor
                          }
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock3 className="size-3.5" />

                          {formatDate(
                            createdAt,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {expanded ? (
                        <ChevronUp className="size-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="size-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailItem
                          label="Log ID"
                          value={
                            id
                          }
                        />

                        <DetailItem
                          label="Action"
                          value={
                            action
                          }
                        />

                        <DetailItem
                          label="Entity"
                          value={
                            entityType
                          }
                        />

                        <DetailItem
                          label="Entity ID"
                          value={
                            entityId
                          }
                        />
                      </div>

                      {details !==
                        null && (
                        <div className="mt-5">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Details
                          </p>

                          <pre className="max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-700">
                            {typeof details ===
                            "string"
                              ? details
                              : JSON.stringify(
                                  details,
                                  null,
                                  2,
                                )}
                          </pre>
                        </div>
                      )}

                      <details className="mt-5">
                        <summary className="cursor-pointer text-xs font-medium text-slate-500">
                          View raw audit
                          record
                        </summary>

                        <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-700">
                          {JSON.stringify(
                            log,
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
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
  icon: typeof Activity
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

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium">
        {value}
      </p>
    </div>
  )
}