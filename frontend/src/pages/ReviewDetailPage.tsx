import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  CircleCheck,
  CircleX,
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  Quote,
  ShieldCheck,
  TriangleAlert,
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
  getReviewQueue,
  openAssetVersionFile,
  submitReview,
} from "@/services/api"

import type {
  AiCheckResult,
  CheckDecision,
  ReviewDecision,
  ReviewQueueVersion,
} from "@/types/dashboard"

function getCheckName(
  type: string,
) {
  if (
    type ===
    "FOREIGN_LOGO"
  ) {
    return "Foreign Logo"
  }

  if (
    type ===
    "BRAND_COMPLIANCE"
  ) {
    return "Brand Compliance"
  }

  if (
    type ===
    "MAS_ADVERTISING"
  ) {
    return "MAS Advertising"
  }

  return type
}

function getScoreStyle(
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

function getDecisionLabel(
  decision: CheckDecision,
) {
  if (
    decision ===
    "ACCEPT_AI"
  ) {
    return "Accept AI"
  }

  if (
    decision ===
    "OVERRIDE_PASS"
  ) {
    return "Override → Pass"
  }

  return "Override → Fail"
}

function ReviewEvidenceBlock({
  result,
}: {
  result: AiCheckResult
}) {
  const hasEvidence =
    Boolean(
      result.sourceQuote?.trim(),
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
                This fail result has no supporting source evidence.
                Verify it manually before accepting the AI conclusion.
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

      {result.uncertainty?.trim() && (
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
export function ReviewDetailPage() {
  const navigate =
    useNavigate()

  const {
    versionId,
  } =
    useParams()

  const [
    version,
    setVersion,
  ] =
    useState<ReviewQueueVersion | null>(
      null,
    )

  const [
    checkDecisions,
    setCheckDecisions,
  ] =
    useState<
      Record<
        number,
        CheckDecision
      >
    >({})

  const [
    checkComments,
    setCheckComments,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({})

  const [
    overallComment,
    setOverallComment,
  ] =
    useState("")

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false)

  const [
    openingFile,
    setOpeningFile,
  ] =
    useState(false)

  const [
    submittedDecision,
    setSubmittedDecision,
  ] =
    useState<ReviewDecision | null>(
      null,
    )

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    )

  useEffect(() => {
    async function loadReview() {
      try {
        setLoading(
          true,
        )

        const id =
          Number(
            versionId,
          )

        if (
          !Number.isInteger(
            id,
          ) ||
          id <= 0
        ) {
          throw new Error(
            "Invalid version ID.",
          )
        }

        const queue =
          await getReviewQueue()

        const selected =
          queue.find(
            (
              item,
            ) =>
              item.id === id,
          )

        if (
          !selected
        ) {
          throw new Error(
            "This version is not currently in the review queue.",
          )
        }

        const initialDecisions:
          Record<
            number,
            CheckDecision
          > = {}

        selected.aiCheckResults.forEach(
          (
            result,
          ) => {
            initialDecisions[
              result.id
            ] =
              "ACCEPT_AI"
          },
        )

        setVersion(
          selected,
        )

        setCheckDecisions(
          initialDecisions,
        )

        setError(
          null,
        )
      } catch (err) {
        console.error(
          "Failed to load review:",
          err,
        )

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load review.",
        )
      } finally {
        setLoading(
          false,
        )
      }
    }

    void loadReview()
  }, [
    versionId,
  ])

  const averageScore =
    useMemo(() => {
      if (
        !version ||
        version.aiCheckResults
          .length === 0
      ) {
        return null
      }

      return Math.round(
        version.aiCheckResults.reduce(
          (
            sum,
            result,
          ) =>
            sum +
            result.score,
          0,
        ) /
          version.aiCheckResults.length,
      )
    }, [
      version,
    ])

  const overrideCount =
    useMemo(() => {
      return Object.values(
        checkDecisions,
      ).filter(
        (
          decision,
        ) =>
          decision !==
          "ACCEPT_AI",
      ).length
    }, [
      checkDecisions,
    ])

  function updateDecision(
    resultId: number,
    decision: CheckDecision,
  ) {
    setCheckDecisions(
      (
        current,
      ) => ({
        ...current,
        [resultId]:
          decision,
      }),
    )

    setError(
      null,
    )
  }

  function updateCheckComment(
    resultId: number,
    comment: string,
  ) {
    setCheckComments(
      (
        current,
      ) => ({
        ...current,
        [resultId]:
          comment,
      }),
    )

    setError(
      null,
    )
  }

  async function handleOpenFile() {
    if (
      !version
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
        version.id,
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to open asset file.",
      )
    } finally {
      setOpeningFile(
        false,
      )
    }
  }

  async function handleSubmit(
    decision: ReviewDecision,
  ) {
    if (
      !version
    ) {
      return
    }

    const missingOverrideComment =
      version.aiCheckResults.find(
        (
          result,
        ) => {
          const checkDecision =
            checkDecisions[
              result.id
            ]

          if (
            checkDecision ===
            "ACCEPT_AI"
          ) {
            return false
          }

          return !checkComments[
            result.id
          ]?.trim()
        },
      )

    if (
      missingOverrideComment
    ) {
      setError(
        `Please explain the override for ${getCheckName(
          missingOverrideComment.checkType,
        )}.`,
      )

      return
    }

    if (
      decision ===
        "REJECTED" &&
      !overallComment.trim()
    ) {
      setError(
        "Please provide a Checker comment explaining why this version is rejected.",
      )

      return
    }

    try {
      setSubmitting(
        true,
      )

      setError(
        null,
      )

      await submitReview(
        version.id,
        {
          decision,

          comment:
            overallComment.trim() ||
            undefined,

          checkDecisions:
            version.aiCheckResults.map(
              (
                result,
              ) => ({
                aiCheckResultId:
                  result.id,

                decision:
                  checkDecisions[
                    result.id
                  ] ??
                  "ACCEPT_AI",

                comment:
                  checkComments[
                    result.id
                  ]?.trim() ||
                  undefined,
              }),
            ),
        },
      )

      setSubmittedDecision(
        decision,
      )
    } catch (err) {
      console.error(
        "Failed to submit review:",
        err,
      )

      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit review.",
      )
    } finally {
      setSubmitting(
        false,
      )
    }
  }

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[500px] items-center justify-center p-4">
        <Loader2 className="size-7 animate-spin text-blue-600" />
      </div>
    )
  }

  if (
    error &&
    !version
  ) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              "/reviews",
            )
          }
        >
          <ArrowLeft className="size-4" />
          Back to queue
        </Button>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      </div>
    )
  }

  if (
    !version
  ) {
    return null
  }

  if (
    submittedDecision
  ) {
    const approved =
      submittedDecision ===
      "APPROVED"

    return (
      <div className="mx-auto max-w-[760px] p-4 sm:p-6 lg:p-8">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-center">
            {approved ? (
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
            ) : (
              <CircleX className="mx-auto size-10 text-red-600" />
            )}

            <h2 className="mt-5 text-2xl font-semibold">
              Version{" "}
              {approved
                ? "approved"
                : "rejected"}
            </h2>

            <Button
              className="mt-6"
              onClick={() =>
                navigate(
                  "/reviews",
                )
              }
            >
              Back to review queue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1450px] p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() =>
          navigate(
            "/reviews",
          )
        }
      >
        <ArrowLeft className="size-4" />
        Back to review queue
      </Button>

      <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-blue-600">
            Checker review
          </p>
          <h2 className="text-2xl font-semibold sm:text-3xl">
            {
              version.asset
                .name
            }
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Version{" "}
            {
              version.versionNumber
            }
            {" · "}
            Version ID{" "}
            {
              version.id
            }
          </p>
        </div>

        <StatusBadge
          status={
            version.status
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              {version.mimeType ===
              "application/pdf" ? (
                <FileText className="size-7 text-red-600" />
              ) : (
                <FileImage className="size-7 text-blue-600" />
              )}

              <h3 className="mt-5 font-semibold">
                Version information
              </h3>

              <div className="mt-5 space-y-4">
                <DetailRow
                  label="File"
                  value={
                    version.fileName
                  }
                />
                <DetailRow
                  label="AI average"
                  value={
                    averageScore !==
                    null
                      ? `${averageScore}/100`
                      : "—"
                  }
                />
                <DetailRow
                  label="Current overrides"
                  value={String(
                    overrideCount,
                  )}
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
                      {version.mimeType ===
                      "application/pdf"
                        ? "Open PDF"
                        : "Open artwork"}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-5 text-blue-700" />
                <p className="font-semibold text-blue-900">
                  Human accountability
                </p>
              </div>

              <p className="mt-3 text-xs leading-5 text-blue-700">
                AI is advisory only. Review the source evidence,
                uncertainty and actual artwork before making the
                final decision.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-slate-100 px-4 py-5 sm:px-6">
                <div className="flex items-center gap-2">
                  <Bot className="size-5 text-blue-600" />
                  <h3 className="font-semibold">
                    AI compliance checks
                  </h3>
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Evidence is displayed separately from the model's reasoning.
                </p>
              </div>

              {version.aiCheckResults.map(
                (
                  result,
                ) => (
                  <ReviewCheck
                    key={
                      result.id
                    }
                    result={
                      result
                    }
                    decision={
                      checkDecisions[
                        result.id
                      ] ??
                      "ACCEPT_AI"
                    }
                    comment={
                      checkComments[
                        result.id
                      ] ??
                      ""
                    }
                    disabled={
                      submitting
                    }
                    onDecisionChange={(
                      decision,
                    ) =>
                      updateDecision(
                        result.id,
                        decision,
                      )
                    }
                    onCommentChange={(
                      comment,
                    ) =>
                      updateCheckComment(
                        result.id,
                        comment,
                      )
                    }
                  />
                ),
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <h3 className="font-semibold">
                Final Checker decision
              </h3>

              <textarea
                rows={5}
                value={
                  overallComment
                }
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) => {
                  setOverallComment(
                    event.target.value,
                  )
                  setError(
                    null,
                  )
                }}
                placeholder="Summarize the human review decision..."
                className="mt-5 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500"
              />

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <TriangleAlert className="mt-0.5 size-4 text-red-600" />
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  disabled={
                    submitting
                  }
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() =>
                    void handleSubmit(
                      "REJECTED",
                    )
                  }
                >
                  <CircleX className="size-4" />
                  Reject version
                </Button>

                <Button
                  disabled={
                    submitting
                  }
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() =>
                    void handleSubmit(
                      "APPROVED",
                    )
                  }
                >
                  <CircleCheck className="size-4" />
                  Approve version
                </Button>
              </div>

              <p className="mt-4 text-right text-xs text-slate-400">
                Checker identity is taken from your signed-in session.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function ReviewCheck({
  result,
  decision,
  comment,
  disabled,
  onDecisionChange,
  onCommentChange,
}: {
  result: AiCheckResult
  decision: CheckDecision
  comment: string
  disabled: boolean
  onDecisionChange: (
    decision: CheckDecision,
  ) => void
  onCommentChange: (
    comment: string,
  ) => void
}) {
  const scoreStyle =
    getScoreStyle(
      result.score,
    )

  const isOverride =
    decision !==
    "ACCEPT_AI"

  const hasEvidence =
    Boolean(
      result.sourceQuote?.trim(),
    )

  const unsupportedFail =
    result.score <=
      30 &&
    !hasEvidence

  return (
    <div className="border-b border-slate-100 p-4 last:border-0 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">
            {getCheckName(
              result.checkType,
            )}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {
              result.ruleReference
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${scoreStyle.className}`}
          >
            {
              scoreStyle.label
            }
          </span>
          <span className="text-2xl font-semibold">
            {
              result.score
            }
          </span>
          <span className="text-sm text-slate-400">
            /100
          </span>
        </div>
      </div>

      {unsupportedFail && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Warning: this legacy fail result has no stored source evidence.
          Do not rely on it without human verification.
        </div>
      )}

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          AI reason
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {
            result.reason
          }
        </p>
      </div>

      <ReviewEvidenceBlock result={result} />

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex items-start gap-3">
          <Quote className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Source evidence
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {hasEvidence
                ? `“${result.sourceQuote}”`
                : result.ruleReference ===
                    "SOURCE_NOT_PROVIDED"
                  ? "No source document was provided for this check."
                  : "No reliable supporting quote was returned."}
            </p>
          </div>
        </div>
      </div>

      {result.uncertainty?.trim() && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Uncertainty
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                {
                  result.uncertainty
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        <span>
          Model:{" "}
          {result.modelName ??
            "Unknown"}
        </span>
        <span>
          Version:{" "}
          {result.modelVersion ??
            "Unknown"}
        </span>
        <span>
          Prompt:{" "}
          {result.promptVersion ??
            "Unknown"}
        </span>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <label className="text-sm font-semibold">
          Checker decision
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {(
            [
              "ACCEPT_AI",
              "OVERRIDE_PASS",
              "OVERRIDE_FAIL",
            ] as CheckDecision[]
          ).map(
            (
              option,
            ) => {
              const active =
                decision ===
                option

              return (
                <button
                  key={
                    option
                  }
                  type="button"
                  disabled={
                    disabled
                  }
                  onClick={() =>
                    onDecisionChange(
                      option,
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition disabled:opacity-60 ${
                    active
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {getDecisionLabel(
                      option,
                    )}
                  </p>
                </button>
              )
            },
          )}
        </div>

        <textarea
          rows={3}
          value={
            comment
          }
          disabled={
            disabled
          }
          onChange={(
            event,
          ) =>
            onCommentChange(
              event.target.value,
            )
          }
          placeholder={
            isOverride
              ? "Override explanation *"
              : "Optional Checker note..."
          }
          className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-500"
        />
      </div>
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

      <span className="max-w-full break-words text-left text-sm font-medium sm:max-w-[180px] sm:text-right">
        {value}
      </span>
    </div>
  )
}
