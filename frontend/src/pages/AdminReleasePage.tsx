import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  CheckCircle2,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  PackageCheck,
  RefreshCw,
  Rocket,
  ShieldCheck,
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
  getAssets,
  openAssetVersionFile,
  releaseVersion,
} from "@/services/api"

import type {
  BackendAsset,
  BackendAssetVersion,
} from "@/types/dashboard"

interface ReleaseQueueItem {
  asset: BackendAsset
  version: BackendAssetVersion
}

function collectVersions(
  assets: BackendAsset[],
  status: BackendAssetVersion["status"],
) {
  const items:
    ReleaseQueueItem[] = []

  assets.forEach(
    (asset) => {
      asset.versions.forEach(
        (version) => {
          if (
            version.status ===
            status
          ) {
            items.push({
              asset,
              version,
            })
          }
        },
      )
    },
  )

  return items.sort(
    (a, b) =>
      new Date(
        b.version.updatedAt,
      ).getTime() -
      new Date(
        a.version.updatedAt,
      ).getTime(),
  )
}

export function AdminReleasePage() {
  const navigate =
    useNavigate()

  const [
    assets,
    setAssets,
  ] =
    useState<
      BackendAsset[]
    >([])

  const [
    notes,
    setNotes,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({})

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    releasingVersionId,
    setReleasingVersionId,
  ] =
    useState<
      number | null
    >(null)

  const [
    openingVersionId,
    setOpeningVersionId,
  ] =
    useState<
      number | null
    >(null)

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null)

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null)

  const loadAssets =
    useCallback(
      async () => {
        try {
          setLoading(true)
          setError(null)

          setAssets(
            await getAssets(),
          )
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load release queue.",
          )
        } finally {
          setLoading(false)
        }
      },
      [],
    )

  useEffect(() => {
    void loadAssets()
  }, [
    loadAssets,
  ])

  const approvedVersions =
    useMemo(
      () =>
        collectVersions(
          assets,
          "APPROVED",
        ),
      [
        assets,
      ],
    )

  const releasedVersions =
    useMemo(
      () =>
        collectVersions(
          assets,
          "RELEASED",
        ),
      [
        assets,
      ],
    )

  async function handleRelease(
    item: ReleaseQueueItem,
  ) {
    if (
      releasingVersionId !==
      null
    ) {
      return
    }

    try {
      setReleasingVersionId(
        item.version.id,
      )

      setError(null)
      setSuccessMessage(null)

      await releaseVersion(
        item.version.id,
        {
          note:
            notes[
              item.version.id
            ]?.trim() ||
            undefined,
        },
      )

      setSuccessMessage(
        `${item.asset.name} v${item.version.versionNumber} was released successfully.`,
      )

      setNotes(
        (current) => {
          const next = {
            ...current,
          }

          delete next[
            item.version.id
          ]

          return next
        },
      )

      await loadAssets()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to release version.",
      )
    } finally {
      setReleasingVersionId(
        null,
      )
    }
  }

  async function handleOpenReleasedFile(
    versionId: number,
  ) {
    try {
      setOpeningVersionId(
        versionId,
      )

      setError(null)

      await openAssetVersionFile(
        versionId,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open released file.",
      )
    } finally {
      setOpeningVersionId(
        null,
      )
    }
  }

  return (
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6 lg:p-8">
      <section className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-600">
            Admin workspace
          </p>

          <h2 className="text-2xl font-semibold sm:text-3xl">
            Release queue
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Only Checker-approved Asset Versions can be released.
            Release identity is taken from the signed-in session.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={
            loading ||
            releasingVersionId !==
              null
          }
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
      </section>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

          <p className="text-sm text-emerald-700">
            {successMessage}
          </p>
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Ready for release"
          value={
            approvedVersions.length
          }
          icon={Rocket}
        />

        <SummaryCard
          title="Released versions"
          value={
            releasedVersions.length
          }
          icon={PackageCheck}
        />
      </section>

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-blue-600" />

              <h3 className="font-semibold">
                Approved versions
              </h3>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Admin can release only versions currently in APPROVED status.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />

              Loading release queue...
            </div>
          ) : approvedVersions.length ===
            0 ? (
            <div className="p-10 text-center">
              <PackageCheck className="mx-auto size-10 text-slate-300" />

              <p className="mt-4 font-medium">
                Nothing ready for release
              </p>

              <p className="mt-1 text-sm text-slate-500">
                A Checker must approve a version before it appears here.
              </p>
            </div>
          ) : (
            approvedVersions.map(
              (
                item,
                index,
              ) => {
                const isReleasing =
                  releasingVersionId ===
                  item.version.id

                return (
                  <div
                    key={
                      item.version.id
                    }
                    className={`p-5 sm:p-6 ${
                      index !==
                      approvedVersions.length -
                        1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
                      <div className="flex min-w-0 gap-4">
                        <FileIcon
                          mimeType={
                            item.version.mimeType
                          }
                        />

                        <div className="min-w-0">
                          <button
                            type="button"
                            className="text-left text-sm font-semibold hover:text-blue-600"
                            onClick={() =>
                              navigate(
                                `/assets/${item.asset.id}`,
                              )
                            }
                          >
                            {
                              item.asset.name
                            }
                          </button>

                          <div className="mt-2">
                            <StatusBadge
                              status={
                                item.version.status
                              }
                            />
                          </div>

                          <p className="mt-3 text-sm text-slate-500">
                            v
                            {
                              item.version.versionNumber
                            }
                            {" · "}
                            Version ID{" "}
                            {
                              item.version.id
                            }
                          </p>

                          <p className="mt-1 break-all text-xs text-slate-400">
                            {
                              item.version.fileName
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Campaign:{" "}
                            {
                              item.asset.campaign.name
                            }
                          </p>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor={`release-note-${item.version.id}`}
                          className="text-xs font-medium text-slate-500"
                        >
                          Release note (optional)
                        </label>

                        <textarea
                          id={`release-note-${item.version.id}`}
                          rows={3}
                          value={
                            notes[
                              item.version.id
                            ] ??
                            ""
                          }
                          disabled={
                            releasingVersionId !==
                            null
                          }
                          onChange={(
                            event,
                          ) =>
                            setNotes(
                              (
                                current,
                              ) => ({
                                ...current,

                                [item.version.id]:
                                  event.target.value,
                              }),
                            )
                          }
                          placeholder="Optional note for this release..."
                          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />

                        <div className="mt-3 flex justify-end">
                          <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={
                              releasingVersionId !==
                              null
                            }
                            onClick={() =>
                              void handleRelease(
                                item,
                              )
                            }
                          >
                            {isReleasing ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Rocket className="size-4" />
                            )}

                            {isReleasing
                              ? "Releasing..."
                              : "Release version"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              },
            )
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-5 text-emerald-600" />

              <h3 className="font-semibold">
                Released versions
              </h3>
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              The original file stays private. The handoff button uses
              the authenticated asset-file endpoint and never exposes
              the storage URL.
            </p>
          </div>

          {releasedVersions.length ===
          0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No released versions yet.
            </div>
          ) : (
            releasedVersions.map(
              (
                item,
                index,
              ) => {
                const isOpening =
                  openingVersionId ===
                  item.version.id

                return (
                  <div
                    key={
                      item.version.id
                    }
                    className={`flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between ${
                      index !==
                      releasedVersions.length -
                        1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 gap-4">
                      <FileIcon
                        mimeType={
                          item.version.mimeType
                        }
                      />

                      <div className="min-w-0">
                        <button
                          type="button"
                          className="text-left text-sm font-semibold hover:text-blue-600"
                          onClick={() =>
                            navigate(
                              `/assets/${item.asset.id}`,
                            )
                          }
                        >
                          {
                            item.asset.name
                          }
                        </button>

                        <p className="mt-1 text-sm text-slate-500">
                          v
                          {
                            item.version.versionNumber
                          }
                          {" · "}
                          Version ID{" "}
                          {
                            item.version.id
                          }
                        </p>

                        <p className="mt-1 break-all text-xs text-slate-400">
                          {
                            item.version.fileName
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <StatusBadge
                        status={
                          item.version.status
                        }
                      />

                      <Button
                        variant="outline"
                        disabled={
                          openingVersionId !==
                          null
                        }
                        onClick={() =>
                          void handleOpenReleasedFile(
                            item.version.id,
                          )
                        }
                      >
                        {isOpening ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ExternalLink className="size-4" />
                        )}

                        Open released file
                      </Button>
                    </div>
                  </div>
                )
              },
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FileIcon({
  mimeType,
}: {
  mimeType?: string | null
}) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
      {mimeType ===
      "application/pdf" ? (
        <FileText className="size-5 text-red-600" />
      ) : (
        <FileImage className="size-5 text-slate-500" />
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: typeof Rocket
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