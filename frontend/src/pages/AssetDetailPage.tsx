import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleX,
  ExternalLink,
  FileImage,
  FileText,
  GitCompareArrows,
  History,
  Loader2,
  Quote,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react"

import {
  useNavigate,
  useParams,
} from "react-router-dom"

import { StatusBadge } from "@/components/dashboard/StatusBadge"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  getLatestVersion,
} from "@/lib/assets"

import {
  getAssets,
  getVersionScoring,
  openAssetVersionFile,
} from "@/services/api"

import {
  getHistoricalRelease,
  getVersionReviews,
} from "@/services/version-history-api"

import type {
  HistoricalRelease,
  HistoricalReview,
} from "@/services/version-history-api"

import type {
  AiCheckResult,
  AssetStatus,
  BackendAsset,
  BackendAssetVersion,
  CheckType,
  ScoringJob,
  VersionScoringResponse,
} from "@/types/dashboard"

const POLLING_INTERVAL_MS =
  3000

const CHECK_TYPES: CheckType[] = [
  "FOREIGN_LOGO",
  "BRAND_COMPLIANCE",
  "MAS_ADVERTISING",
]

function getCheckName(
  checkType: string,
) {
  if (
    checkType ===
    "FOREIGN_LOGO"
  ) {
    return "Foreign Logo"
  }

  if (
    checkType ===
    "BRAND_COMPLIANCE"
  ) {
    return "Brand Compliance"
  }

  if (
    checkType ===
    "MAS_ADVERTISING"
  ) {
    return "MAS Advertising"
  }

  return checkType
}

function getScoreInfo(
  score: number,
) {
  if (
    score >= 71
  ) {
    return {
      label:
        "Pass",

      className:
        "bg-emerald-50 text-emerald-700",
    }
  }

  if (
    score >= 31
  ) {
    return {
      label:
        "Human review",

      className:
        "bg-amber-50 text-amber-700",
    }
  }

  return {
    label:
      "Fail",

    className:
      "bg-red-50 text-red-700",
  }
}

function getLatestJob(
  jobs?: ScoringJob[],
) {
  if (
    !jobs?.length
  ) {
    return null
  }

  return [
    ...jobs,
  ].sort(
    (
      a,
      b,
    ) =>
      new Date(
        b.createdAt,
      ).getTime() -
      new Date(
        a.createdAt,
      ).getTime(),
  )[0]
}

function shouldPoll(
  status?: AssetStatus,
) {
  return (
    status ===
      "DRAFT" ||
    status ===
      "SCORING"
  )
}

function formatBytes(
  bytes?: number | null,
) {
  if (
    bytes ===
      null ||
    bytes ===
      undefined
  ) {
    return "Unknown"
  }

  if (
    bytes < 1024
  ) {
    return `${bytes} B`
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

function EvidenceBlock({
  result,
}: {
  result: AiCheckResult
}) {
  const hasEvidence =
    Boolean(
      result.sourceQuote?.trim(),
    )

  const hasUncertainty =
    Boolean(
      result.uncertainty?.trim(),
    )

  const unsupportedFail =
    result.score <= 30 &&
    !hasEvidence

  return (
    <div className="mt-4 space-y-3">
      {unsupportedFail && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-600" />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Evidence warning
              </p>

              <p className="mt-2 text-sm leading-6 text-red-800">
                This fail result has no stored supporting evidence.
                Human verification is required.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={`rounded-xl border p-4 ${
          hasEvidence
            ? "border-emerald-200 bg-emerald-50/70"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <div className="flex items-start gap-3">
          <Quote
            className={`mt-0.5 size-4 shrink-0 ${
              hasEvidence
                ? "text-emerald-600"
                : "text-slate-400"
            }`}
          />

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source evidence
            </p>

            <p className="mt-2 break-words text-sm leading-6 text-slate-700">
              {hasEvidence
                ? `"${result.sourceQuote}"`
                : result.ruleReference === "SOURCE_NOT_PROVIDED"
                  ? "No campaign compliance document was provided for this check."
                  : "No reliable supporting quote was returned."}
            </p>
          </div>
        </div>
      </div>

      {hasUncertainty && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Uncertainty
              </p>

              <p className="mt-2 break-words text-sm leading-6 text-amber-900">
                {result.uncertainty}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          Model: {result.modelName ?? "Unknown"}
        </span>

        <span>
          Version: {result.modelVersion ?? "Unknown"}
        </span>

        <span>
          Prompt: {result.promptVersion ?? "Unknown"}
        </span>
      </div>
    </div>
  )
}
export function AssetDetailPage() {
  const navigate =
    useNavigate()

  const {
    assetId,
  } =
    useParams()

  const [
    asset,
    setAsset,
  ] =
    useState<BackendAsset | null>(
      null,
    )

  const [
    selectedVersionId,
    setSelectedVersionId,
  ] =
    useState<number | null>(
      null,
    )

  const [
    scoring,
    setScoring,
  ] =
    useState<VersionScoringResponse | null>(
      null,
    )

  const [
    previousScoring,
    setPreviousScoring,
  ] =
    useState<VersionScoringResponse | null>(
      null,
    )

  const [
    reviews,
    setReviews,
  ] =
    useState<HistoricalReview[]>(
      [],
    )

  const [
    release,
    setRelease,
  ] =
    useState<HistoricalRelease | null>(
      null,
    )

  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    )

  const [
    detailsLoading,
    setDetailsLoading,
  ] =
    useState(
      false,
    )

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false,
    )

  const [
    openingFile,
    setOpeningFile,
  ] =
    useState(
      false,
    )

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    )

  const loadAsset =
    useCallback(
      async (
        silent =
          false,
      ) => {
        try {
          if (
            !silent
          ) {
            setLoading(
              true,
            )
          }

          const numericAssetId =
            Number(
              assetId,
            )

          if (
            !Number.isInteger(
              numericAssetId,
            ) ||
            numericAssetId <=
              0
          ) {
            throw new Error(
              "Invalid asset ID.",
            )
          }

          const assets =
            await getAssets()

          const selectedAsset =
            assets.find(
              (
                item,
              ) =>
                item.id ===
                numericAssetId,
            )

          if (
            !selectedAsset
          ) {
            throw new Error(
              "Asset not found.",
            )
          }

          setAsset(
            selectedAsset,
          )

          const newestVersion =
            getLatestVersion(
              selectedAsset,
            )

          setSelectedVersionId(
            (
              currentVersionId,
            ) => {
              const currentStillExists =
                selectedAsset
                  .versions
                  .some(
                    (
                      version,
                    ) =>
                      version.id ===
                      currentVersionId,
                  )

              if (
                currentVersionId &&
                currentStillExists
              ) {
                return currentVersionId
              }

              return (
                newestVersion?.id ??
                null
              )
            },
          )

          setError(
            null,
          )
        } catch (err) {
          console.error(
            "Failed to load asset detail:",
            err,
          )

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load asset.",
          )
        } finally {
          if (
            !silent
          ) {
            setLoading(
              false,
            )
          }
        }
      },
      [
        assetId,
      ],
    )

  useEffect(() => {
    void loadAsset()
  }, [
    loadAsset,
  ])

  const orderedVersions =
    useMemo(() => {
      if (
        !asset
      ) {
        return []
      }

      return [
        ...asset.versions,
      ].sort(
        (
          a,
          b,
        ) =>
          b.versionNumber -
          a.versionNumber,
      )
    }, [
      asset,
    ])

  const selectedVersion =
    useMemo<
      BackendAssetVersion | null
    >(() => {
      if (
        !asset ||
        !selectedVersionId
      ) {
        return null
      }

      return (
        asset.versions.find(
          (
            version,
          ) =>
            version.id ===
            selectedVersionId,
        ) ??
        null
      )
    }, [
      asset,
      selectedVersionId,
    ])

  const latestVersion =
    useMemo(() => {
      if (
        !asset
      ) {
        return null
      }

      return getLatestVersion(
        asset,
      )
    }, [
      asset,
    ])

  const previousVersion =
    useMemo<
      BackendAssetVersion | null
    >(() => {
      if (
        !asset ||
        !selectedVersion
      ) {
        return null
      }

      return (
        asset.versions
          .filter(
            (
              version,
            ) =>
              version.versionNumber <
              selectedVersion.versionNumber,
          )
          .sort(
            (
              a,
              b,
            ) =>
              b.versionNumber -
              a.versionNumber,
          )[0] ??
        null
      )
    }, [
      asset,
      selectedVersion,
    ])

  const loadVersionDetails =
    useCallback(
      async (
        version:
          BackendAssetVersion,
      ) => {
        try {
          setDetailsLoading(
            true,
          )

          const [
            scoringData,
            reviewData,
            releaseData,
          ] =
            await Promise.all([
              getVersionScoring(
                version.id,
              ),

              getVersionReviews(
                version.id,
              ),

              version.status ===
              "RELEASED"
                ? getHistoricalRelease(
                    version.id,
                  )
                : Promise.resolve(
                    null,
                  ),
            ])

          setScoring(
            scoringData,
          )

          setReviews(
            reviewData,
          )

          setRelease(
            releaseData,
          )

          if (
            previousVersion
          ) {
            try {
              const previousData =
                await getVersionScoring(
                  previousVersion.id,
                )

              setPreviousScoring(
                previousData,
              )
            } catch {
              setPreviousScoring(
                null,
              )
            }
          } else {
            setPreviousScoring(
              null,
            )
          }

          setError(
            null,
          )
        } catch (err) {
          console.error(
            "Failed to load version details:",
            err,
          )

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load version details.",
          )
        } finally {
          setDetailsLoading(
            false,
          )
        }
      },
      [
        previousVersion,
      ],
    )

  useEffect(() => {
    if (
      !selectedVersion
    ) {
      setScoring(
        null,
      )

      setReviews(
        [],
      )

      setRelease(
        null,
      )

      setPreviousScoring(
        null,
      )

      return
    }

    void loadVersionDetails(
      selectedVersion,
    )
  }, [
    selectedVersion,
    loadVersionDetails,
  ])

  const effectiveStatus:
    AssetStatus | undefined =
    scoring?.status ??
    selectedVersion?.status

  const isSelectedLatest =
    selectedVersion?.id ===
    latestVersion?.id

  useEffect(() => {
    if (
      !selectedVersion ||
      !isSelectedLatest ||
      !shouldPoll(
        effectiveStatus,
      )
    ) {
      return
    }

    const interval =
      window.setInterval(
        async () => {
          try {
            const scoringData =
              await getVersionScoring(
                selectedVersion.id,
              )

            setScoring(
              scoringData,
            )

            if (
              !shouldPoll(
                scoringData.status,
              )
            ) {
              await loadAsset(
                true,
              )
            }
          } catch (err) {
            console.error(
              "Polling failed:",
              err,
            )
          }
        },
        POLLING_INTERVAL_MS,
      )

    return () => {
      window.clearInterval(
        interval,
      )
    }
  }, [
    effectiveStatus,
    isSelectedLatest,
    loadAsset,
    selectedVersion,
  ])

  const aiResults =
    useMemo<
      AiCheckResult[]
    >(() => {
      if (
        scoring
          ?.aiCheckResults
          ?.length
      ) {
        return scoring
          .aiCheckResults
      }

      return (
        scoring
          ?.scoringJobs
          ?.flatMap(
            (
              job,
            ) =>
              job.results ??
              [],
          ) ??
        []
      )
    }, [
      scoring,
    ])

  const previousAiResults =
    useMemo<
      AiCheckResult[]
    >(() => {
      if (
        previousScoring
          ?.aiCheckResults
          ?.length
      ) {
        return previousScoring
          .aiCheckResults
      }

      return (
        previousScoring
          ?.scoringJobs
          ?.flatMap(
            (
              job,
            ) =>
              job.results ??
              [],
          ) ??
        []
      )
    }, [
      previousScoring,
    ])

  const latestJob =
    useMemo(
      () =>
        getLatestJob(
          scoring?.scoringJobs,
        ),
      [
        scoring,
      ],
    )

  const rejectionReview =
    useMemo(() => {
      return (
        [
          ...reviews,
        ]
          .reverse()
          .find(
            (
              review,
            ) =>
              review.decision ===
              "REJECTED",
          ) ??
        null
      )
    }, [
      reviews,
    ])

  const comparisonRows =
    useMemo(() => {
      return CHECK_TYPES.map(
        (
          checkType,
        ) => {
          const current =
            aiResults.find(
              (
                result,
              ) =>
                result.checkType ===
                checkType,
            )

          const previous =
            previousAiResults.find(
              (
                result,
              ) =>
                result.checkType ===
                checkType,
            )

          const currentLabel =
            current
              ? getScoreInfo(
                  current.score,
                ).label
              : "No result"

          const previousLabel =
            previous
              ? getScoreInfo(
                  previous.score,
                ).label
              : "No result"

          return {
            checkType,
            current,
            previous,
            currentLabel,
            previousLabel,

            changed:
              currentLabel !==
                previousLabel ||
              current?.score !==
                previous?.score,
          }
        },
      )
    }, [
      aiResults,
      previousAiResults,
    ])

  async function handleRefresh() {
    try {
      setRefreshing(
        true,
      )

      await loadAsset(
        true,
      )

      if (
        selectedVersion
      ) {
        await loadVersionDetails(
          selectedVersion,
        )
      }
    } finally {
      setRefreshing(
        false,
      )
    }
  }

  async function handleOpenFile() {
    if (
      !selectedVersion
    ) {
      return
    }

    try {
      setOpeningFile(
        true,
      )

      setError(
        null,
      )

      await openAssetVersionFile(
        selectedVersion.id,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open file.",
      )
    } finally {
      setOpeningFile(
        false,
      )
    }
  }

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading asset...
          </p>
        </div>
      </div>
    )
  }

  if (
    error &&
    !asset
  ) {
    return (
      <div className="p-4 sm:p-8">
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              "/assets",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Back
        </Button>

        <p className="mt-6 text-sm text-red-500">
          {error}
        </p>
      </div>
    )
  }

  if (
    !asset
  ) {
    return null
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          onClick={() =>
            navigate(
              "/assets",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Back to assets
        </Button>

        <Button
          variant="outline"
          disabled={
            refreshing
          }
          onClick={
            handleRefresh
          }
          className="w-full rounded-xl sm:w-auto"
        >
          <RefreshCw
            className={`size-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </Button>
      </div>

      <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 break-words text-sm font-medium text-blue-600">
            {
              asset
                .campaign
                ?.name
            }
          </p>

          <h2 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
            {
              asset.name
            }
          </h2>

          <p className="mt-2 max-w-2xl break-words text-sm text-slate-500">
            {asset.description ??
              "No description provided."}
          </p>
        </div>

        {effectiveStatus && (
          <div className="shrink-0">
            <StatusBadge
              status={
                effectiveStatus
              }
            />
          </div>
        )}
      </section>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isSelectedLatest &&
        selectedVersion && (
          <Card className="mb-6 border-amber-200 bg-amber-50 shadow-none">
            <CardContent className="flex items-start gap-3 p-5">
              <History className="mt-0.5 size-5 shrink-0 text-amber-700" />

              <div>
                <p className="font-semibold text-amber-900">
                  Historical version
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  You are viewing v
                  {
                    selectedVersion.versionNumber
                  }
                  . The latest version is v
                  {
                    latestVersion
                      ?.versionNumber
                  }
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {rejectionReview &&
        selectedVersion?.status ===
          "REJECTED" && (
          <Card className="mb-6 border-red-200 bg-red-50 shadow-none">
            <CardContent className="flex gap-4 p-5">
              <CircleX className="mt-0.5 size-6 shrink-0 text-red-600" />

              <div>
                <p className="font-semibold text-red-900">
                  Rejection reason
                </p>

                <p className="mt-2 text-sm leading-6 text-red-800">
                  {rejectionReview.comment ??
                    "No rejection comment was recorded."}
                </p>

                <p className="mt-2 text-xs text-red-600">
                  Checker:{" "}
                  {rejectionReview
                    .checker
                    ?.name ||
                    rejectionReview
                      .checker
                      ?.email ||
                    `User ${rejectionReview.checkerId}`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {isSelectedLatest &&
        shouldPoll(
          effectiveStatus,
        ) && (
          <Card className="mb-6 overflow-hidden border-blue-200 bg-blue-50/60 shadow-none">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <Loader2 className="size-5 animate-spin text-blue-600" />
              </div>

              <div>
                <p className="font-semibold text-blue-950">
                  AI compliance analysis is running
                </p>

                <p className="mt-1 text-sm text-blue-700/80">
                  The background worker is processing this version.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="min-w-0 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50">
                  <History className="size-5 text-blue-600" />
                </div>

                <div>
                  <h3 className="font-semibold">
                    Version History
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Select any version to inspect its history.
                  </p>
                </div>
              </div>

              {orderedVersions.length ===
              0 ? (
                <p className="mt-5 text-sm text-slate-500">
                  No versions uploaded.
                </p>
              ) : (
                <div className="mt-5 space-y-2">
                  {orderedVersions.map(
                    (
                      version,
                    ) => {
                      const isSelected =
                        version.id ===
                        selectedVersionId

                      const isLatest =
                        version.id ===
                        latestVersion?.id

                      return (
                        <button
                          key={
                            version.id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedVersionId(
                              version.id,
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            isSelected
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">
                                  v
                                  {
                                    version.versionNumber
                                  }
                                </p>

                                {isLatest && (
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                                    Latest
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {
                                  version.fileName
                                }
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <StatusBadge
                                status={
                                  version.status
                                }
                              />

                              <ArrowRight className="size-4 text-slate-400" />
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                            <span>
                              User #
                              {
                                version.uploadedById
                              }
                            </span>

                            <span>
                              {new Date(
                                version.createdAt,
                              ).toLocaleString()}
                            </span>
                          </div>
                        </button>
                      )
                    },
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50">
                {selectedVersion
                  ?.mimeType ===
                "application/pdf" ? (
                  <FileText className="size-6 text-red-600" />
                ) : (
                  <FileImage className="size-6 text-blue-600" />
                )}
              </div>

              <h3 className="font-semibold">
                Selected version
              </h3>

              {selectedVersion ? (
                <div className="mt-5 space-y-4">
                  <DetailRow
                    label="Version"
                    value={`v${selectedVersion.versionNumber}`}
                  />

                  <DetailRow
                    label="Version ID"
                    value={String(
                      selectedVersion.id,
                    )}
                  />

                  <DetailRow
                    label="Status"
                    value={
                      effectiveStatus ??
                      selectedVersion.status
                    }
                  />

                  <DetailRow
                    label="Uploader"
                    value={`User ${selectedVersion.uploadedById}`}
                  />

                  <DetailRow
                    label="File"
                    value={
                      selectedVersion.fileName
                    }
                  />

                  <DetailRow
                    label="Type"
                    value={
                      selectedVersion.mimeType ??
                      "Unknown"
                    }
                  />

                  <DetailRow
                    label="Size"
                    value={formatBytes(
                      selectedVersion.fileSize,
                    )}
                  />

                  <DetailRow
                    label="Uploaded"
                    value={new Date(
                      selectedVersion.createdAt,
                    ).toLocaleString()}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    disabled={
                      openingFile
                    }
                    onClick={() =>
                      void handleOpenFile()
                    }
                  >
                    {openingFile ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />

                        Opening...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="size-4" />

                        {selectedVersion.mimeType ===
                        "application/pdf"
                          ? "Open PDF"
                          : "Open artwork"}
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No selected version.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-semibold">
                Asset information
              </h3>

              <div className="mt-5 space-y-4">
                <DetailRow
                  label="Asset ID"
                  value={String(
                    asset.id,
                  )}
                />

                <DetailRow
                  label="Created by"
                  value={
                    asset.createdBy
                      ?.name ||
                    asset.createdBy
                      ?.email ||
                    "Unknown"
                  }
                />

                <DetailRow
                  label="Versions"
                  value={String(
                    asset
                      .versions
                      .length,
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          {detailsLoading && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="flex items-center justify-center gap-3 p-8">
                <Loader2 className="size-5 animate-spin text-blue-600" />

                <p className="text-sm text-slate-500">
                  Loading version history...
                </p>
              </CardContent>
            </Card>
          )}

          {!detailsLoading && (
            <>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-5 sm:px-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <Bot className="size-5 text-blue-600" />

                        <h3 className="font-semibold">
                          AI Compliance Analysis
                        </h3>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">
                        AI results stored for v
                        {
                          selectedVersion
                            ?.versionNumber
                        }
                        .
                      </p>
                    </div>

                    <ShieldCheck className="size-5 text-slate-400" />
                  </div>

                  {aiResults.length ===
                    0 && (
                    <div className="p-8 text-center">
                      <Bot className="mx-auto mb-3 size-9 text-slate-300" />

                      <p className="text-sm font-medium">
                        No AI results
                      </p>
                    </div>
                  )}

                  {aiResults.map(
                    (
                      result,
                    ) => {
                      const scoreInfo =
                        getScoreInfo(
                          result.score,
                        )

                      return (
                        <div
                          key={
                            result.id
                          }
                          className="border-b border-slate-100 p-4 last:border-0 sm:p-6"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold">
                                {getCheckName(
                                  result.checkType,
                                )}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                Compliance check
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${scoreInfo.className}`}
                              >
                                {
                                  scoreInfo.label
                                }
                              </span>

                              <span className="text-2xl font-semibold">
                                {
                                  result.score
                                }
                              </span>

                              <span className="text-sm text-slate-400">
                                / 100
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              AI Reason
                            </p>

                            <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                              {
                                result.reason
                              }
                            </p>
                          </div>

                      <EvidenceBlock result={result} />

                          <div className="mt-4 flex items-start gap-3">
                            <FileText className="mt-0.5 size-4 text-slate-400" />

                            <div>
                              <p className="text-xs text-slate-400">
                                Rule reference
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {
                                  result.ruleReference
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    },
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50">
                      <UserRound className="size-5 text-violet-600" />
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        Review History
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Human decisions attached to this version.
                      </p>
                    </div>
                  </div>

                  {reviews.length ===
                  0 ? (
                    <p className="mt-5 text-sm text-slate-500">
                      No Checker review recorded.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {reviews.map(
                        (
                          review,
                        ) => (
                          <div
                            key={
                              review.id
                            }
                            className="rounded-xl border border-slate-200 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-semibold">
                                  {review
                                    .checker
                                    ?.name ||
                                    review
                                      .checker
                                      ?.email ||
                                    `User ${review.checkerId}`}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {new Date(
                                    review.createdAt,
                                  ).toLocaleString()}
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  review.decision ===
                                  "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {
                                  review.decision
                                }
                              </span>
                            </div>

                            {review.comment && (
                              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Checker comment
                                </p>

                                <p className="mt-2 text-sm leading-6 text-slate-700">
                                  {
                                    review.comment
                                  }
                                </p>
                              </div>
                            )}

                            {review
                              .checkDecisions
                              ?.length >
                              0 && (
                              <div className="mt-4 space-y-2">
                                {review.checkDecisions.map(
                                  (
                                    decision,
                                  ) => (
                                    <div
                                      key={
                                        decision.id
                                      }
                                      className="flex flex-col justify-between gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center"
                                    >
                                      <div>
                                        <p className="text-sm font-medium">
                                          {decision
                                            .aiCheckResult
                                            ? getCheckName(
                                                decision
                                                  .aiCheckResult
                                                  .checkType,
                                              )
                                            : `AI Check ${decision.aiCheckResultId}`}
                                        </p>

                                        {decision.comment && (
                                          <p className="mt-1 text-xs text-slate-500">
                                            {
                                              decision.comment
                                            }
                                          </p>
                                        )}
                                      </div>

                                      <span className="text-xs font-semibold text-slate-600">
                                        {
                                          decision.decision
                                        }
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-emerald-600" />

                    <h3 className="font-semibold">
                      Release
                    </h3>
                  </div>

                  {selectedVersion
                    ?.status ===
                    "RELEASED" &&
                  release ? (
                    <div className="mt-5 space-y-4">
                      <DetailRow
                        label="Released by"
                        value={
                          release.releasedById
                            ? `User ${release.releasedById}`
                            : "Unknown"
                        }
                      />

                      <DetailRow
                        label="Released"
                        value={
                          release.createdAt
                            ? new Date(
                                release.createdAt,
                              ).toLocaleString()
                            : "Unknown"
                        }
                      />

                      <DetailRow
                        label="Release note"
                        value={
                          release.note ??
                          "No release note"
                        }
                      />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      This version has not been released.
                    </p>
                  )}
                </CardContent>
              </Card>

              {previousVersion && (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100">
                        <GitCompareArrows className="size-5 text-slate-700" />
                      </div>

                      <div>
                        <h3 className="font-semibold">
                          Version Comparison
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          v
                          {
                            selectedVersion
                              ?.versionNumber
                          }{" "}
                          compared with v
                          {
                            previousVersion.versionNumber
                          }
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full min-w-[650px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="pb-3 pr-4">
                              Field
                            </th>

                            <th className="pb-3 pr-4">
                              Previous
                            </th>

                            <th className="pb-3 pr-4">
                              Current
                            </th>

                            <th className="pb-3">
                              Change
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          <ComparisonRow
                            label="Status"
                            previous={
                              previousVersion.status
                            }
                            current={
                              selectedVersion
                                ?.status ??
                              "Unknown"
                            }
                          />

                          <ComparisonRow
                            label="File"
                            previous={
                              previousVersion.fileName
                            }
                            current={
                              selectedVersion
                                ?.fileName ??
                              "Unknown"
                            }
                          />

                          <ComparisonRow
                            label="File size"
                            previous={formatBytes(
                              previousVersion.fileSize,
                            )}
                            current={formatBytes(
                              selectedVersion
                                ?.fileSize,
                            )}
                          />

                          {comparisonRows.map(
                            (
                              row,
                            ) => (
                              <tr
                                key={
                                  row.checkType
                                }
                                className="border-b border-slate-100 last:border-0"
                              >
                                <td className="py-4 pr-4 font-medium">
                                  {getCheckName(
                                    row.checkType,
                                  )}
                                </td>

                                <td className="py-4 pr-4">
                                  {row.previous
                                    ? `${row.previous.score}/100 · ${row.previousLabel}`
                                    : "No result"}
                                </td>

                                <td className="py-4 pr-4">
                                  {row.current
                                    ? `${row.current.score}/100 · ${row.currentLabel}`
                                    : "No result"}
                                </td>

                                <td className="py-4">
                                  {row.changed ? (
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                      Changed
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                      Same
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {latestJob && (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6">
                    <h3 className="font-semibold">
                      Scoring job
                    </h3>

                    <div className="mt-5 space-y-4">
                      <DetailRow
                        label="Job ID"
                        value={String(
                          latestJob.id,
                        )}
                      />

                      <DetailRow
                        label="Status"
                        value={
                          latestJob.status
                        }
                      />

                      <DetailRow
                        label="Retries"
                        value={String(
                          latestJob.retryCount,
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="max-w-full break-words text-left text-sm font-medium sm:max-w-[210px] sm:text-right">
        {value}
      </span>
    </div>
  )
}

function ComparisonRow({
  label,
  previous,
  current,
}: {
  label: string
  previous: string
  current: string
}) {
  const changed =
    previous !==
    current

  return (
    <tr className="border-b border-slate-100">
      <td className="py-4 pr-4 font-medium">
        {label}
      </td>

      <td className="py-4 pr-4">
        {previous}
      </td>

      <td className="py-4 pr-4">
        {current}
      </td>

      <td className="py-4">
        {changed ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Changed
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            Same
          </span>
        )}
      </td>
    </tr>
  )
}
