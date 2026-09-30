import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  CheckCircle2,
  FileText,
  Loader2,
  Power,
  PowerOff,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  useAuth,
} from "@/context/AuthContext"

import {
  activateComplianceDocument,
  deactivateComplianceDocument,
  getCampaigns,
  getComplianceDocuments,
  uploadComplianceDocument,
} from "@/services/api"

import type {
  BackendCampaign,
  BackendComplianceDocument,
  ComplianceDocumentType,
} from "@/types/dashboard"

const documentTypes: {
  value: ComplianceDocumentType
  label: string
  description: string
}[] = [
  {
    value: "FOREIGN_LOGO_POLICY",
    label: "Foreign Logo Policy",
    description:
      "Rules governing third-party logos, trademarks and brand identifiers.",
  },
  {
    value: "BRAND_GUIDELINE",
    label: "Brand Guideline",
    description:
      "Brand identity, logo, colors and marketing presentation requirements.",
  },
  {
    value: "MAS_RULES",
    label: "MAS Advertising Rules",
    description:
      "Advertising and promotional compliance requirements used by AI checks.",
  },
]

function getDocumentTypeLabel(
  type: ComplianceDocumentType,
) {
  return (
    documentTypes.find(
      (item) =>
        item.value === type,
    )?.label ?? type
  )
}

export function ComplianceDocumentsPage() {
  const {
    user,
  } =
    useAuth()

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<
      BackendCampaign[]
    >([])

  const [
    campaignId,
    setCampaignId,
  ] =
    useState("")

  const [
    loadingCampaigns,
    setLoadingCampaigns,
  ] =
    useState(true)

  const [
    hasLoadedCampaigns,
    setHasLoadedCampaigns,
  ] =
    useState(false)

  const [
    campaignError,
    setCampaignError,
  ] =
    useState<string | null>(
      null,
    )

  const [
    documents,
    setDocuments,
  ] =
    useState<
      BackendComplianceDocument[]
    >([])

  const [
    loadingDocuments,
    setLoadingDocuments,
  ] =
    useState(false)

  const [
    hasLoadedDocuments,
    setHasLoadedDocuments,
  ] =
    useState(false)

  const [
    documentError,
    setDocumentError,
  ] =
    useState<string | null>(
      null,
    )

  const [
    title,
    setTitle,
  ] =
    useState("")

  const [
    version,
    setVersion,
  ] =
    useState("")

  const [
    documentType,
    setDocumentType,
  ] =
    useState<ComplianceDocumentType>(
      "BRAND_GUIDELINE",
    )

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    )

  const [
    uploading,
    setUploading,
  ] =
    useState(false)

  const [
    changingDocumentId,
    setChangingDocumentId,
  ] =
    useState<number | null>(
      null,
    )

  const [
    actionError,
    setActionError,
  ] =
    useState<string | null>(
      null,
    )

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<string | null>(
      null,
    )

  const actionInProgress =
    uploading ||
    changingDocumentId !== null

  const loadCampaigns =
    useCallback(
      async () => {
        try {
          setLoadingCampaigns(
            true,
          )

          setCampaignError(
            null,
          )

          const data =
            await getCampaigns()

          const manageableCampaigns =
            data.filter(
              (campaign) => {
                const isOwner =
                  user?.campaignsOwned.some(
                    (
                      ownedCampaign,
                    ) =>
                      ownedCampaign.id ===
                      campaign.id,
                  ) ?? false

                const isAdmin =
                  user?.campaignMemberships.some(
                    (
                      membership,
                    ) =>
                      membership.campaignId ===
                        campaign.id &&
                      membership.role ===
                        "ADMIN",
                  ) ?? false

                return (
                  isOwner ||
                  isAdmin
                )
              },
            )

          setCampaigns(
            manageableCampaigns,
          )

          setCampaignId(
            (current) => {
              if (
                current &&
                manageableCampaigns.some(
                  (
                    campaign,
                  ) =>
                    String(
                      campaign.id,
                    ) ===
                    current,
                )
              ) {
                return current
              }

              return manageableCampaigns[0]
                ? String(
                    manageableCampaigns[0]
                      .id,
                  )
                : ""
            },
          )

          setHasLoadedCampaigns(
            true,
          )
        } catch (err) {
          console.error(
            "Failed to load campaigns:",
            err,
          )

          setCampaignError(
            err instanceof Error
              ? err.message
              : "Unable to load campaigns.",
          )
        } finally {
          setLoadingCampaigns(
            false,
          )
        }
      },
      [
        user,
      ],
    )

  const loadDocuments =
    useCallback(
      async (
        selectedCampaignId: number,
      ) => {
        try {
          setLoadingDocuments(
            true,
          )

          setDocumentError(
            null,
          )

          const data =
            await getComplianceDocuments(
              selectedCampaignId,
            )

          setDocuments(
            data,
          )

          setHasLoadedDocuments(
            true,
          )
        } catch (err) {
          console.error(
            "Failed to load compliance documents:",
            err,
          )

          setDocumentError(
            err instanceof Error
              ? err.message
              : "Unable to load compliance documents.",
          )
        } finally {
          setLoadingDocuments(
            false,
          )
        }
      },
      [],
    )

  useEffect(() => {
    void loadCampaigns()
  }, [
    loadCampaigns,
  ])

  useEffect(() => {
    if (!campaignId) {
      setDocuments([])
      setHasLoadedDocuments(
        false,
      )
      setLoadingDocuments(
        false,
      )
      setDocumentError(
        null,
      )

      return
    }

    setDocuments([])
    setHasLoadedDocuments(
      false,
    )
    setDocumentError(
      null,
    )
    setActionError(
      null,
    )
    setSuccessMessage(
      null,
    )

    void loadDocuments(
      Number(
        campaignId,
      ),
    )
  }, [
    campaignId,
    loadDocuments,
  ])

  const selectedCampaign =
    useMemo(() => {
      return campaigns.find(
        (campaign) =>
          String(
            campaign.id,
          ) === campaignId,
      )
    }, [
      campaigns,
      campaignId,
    ])

  const sortedDocuments =
    useMemo(() => {
      return [...documents].sort(
        (
          a,
          b,
        ) => {
          if (
            a.isActive !==
            b.isActive
          ) {
            return a.isActive
              ? -1
              : 1
          }

          return (
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime()
          )
        },
      )
    }, [
      documents,
    ])

  const activeCount =
    useMemo(() => {
      return documents.filter(
        (document) =>
          document.isActive,
      ).length
    }, [
      documents,
    ])

  const metricsUnavailable =
    Boolean(campaignId) &&
    !hasLoadedDocuments &&
    (
      loadingDocuments ||
      Boolean(
        documentError,
      )
    )

  function handleCampaignChange(
    value: string,
  ) {
    setCampaignId(
      value,
    )

    setActionError(
      null,
    )

    setSuccessMessage(
      null,
    )
  }

  function handleFileChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null

    setFile(
      selectedFile,
    )

    setActionError(
      null,
    )
  }

  async function handleUpload() {
    if (!campaignId) {
      setActionError(
        "Please select a campaign.",
      )

      return
    }

    if (!title.trim()) {
      setActionError(
        "Document title is required.",
      )

      return
    }

    if (!version.trim()) {
      setActionError(
        "Document version is required.",
      )

      return
    }

    if (!file) {
      setActionError(
        "Please select a document file.",
      )

      return
    }

    if (
      actionInProgress
    ) {
      return
    }

    try {
      setUploading(
        true,
      )

      setActionError(
        null,
      )

      setSuccessMessage(
        null,
      )

      await uploadComplianceDocument(
        {
          campaignId:
            Number(
              campaignId,
            ),

          title:
            title.trim(),

          version:
            version.trim(),

          documentType,

          file,
        },
      )

      setSuccessMessage(
        `${title.trim()} ${version.trim()} uploaded successfully.`,
      )

      setTitle("")
      setVersion("")
      setFile(null)

      const fileInput =
        document.getElementById(
          "compliance-file",
        ) as
          | HTMLInputElement
          | null

      if (
        fileInput
      ) {
        fileInput.value =
          ""
      }

      await loadDocuments(
        Number(
          campaignId,
        ),
      )
    } catch (err) {
      console.error(
        "Failed to upload compliance document:",
        err,
      )

      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to upload compliance document.",
      )
    } finally {
      setUploading(
        false,
      )
    }
  }

  async function handleActivate(
    documentId: number,
  ) {
    if (
      !campaignId ||
      actionInProgress
    ) {
      return
    }

    try {
      setChangingDocumentId(
        documentId,
      )

      setActionError(
        null,
      )

      setSuccessMessage(
        null,
      )

      await activateComplianceDocument(
        documentId,
      )

      setSuccessMessage(
        "Document activated successfully.",
      )

      await loadDocuments(
        Number(
          campaignId,
        ),
      )
    } catch (err) {
      console.error(
        "Failed to activate document:",
        err,
      )

      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to activate document.",
      )
    } finally {
      setChangingDocumentId(
        null,
      )
    }
  }

  async function handleDeactivate(
    documentId: number,
  ) {
    if (
      !campaignId ||
      actionInProgress
    ) {
      return
    }

    try {
      setChangingDocumentId(
        documentId,
      )

      setActionError(
        null,
      )

      setSuccessMessage(
        null,
      )

      await deactivateComplianceDocument(
        documentId,
      )

      setSuccessMessage(
        "Document deactivated successfully.",
      )

      await loadDocuments(
        Number(
          campaignId,
        ),
      )
    } catch (err) {
      console.error(
        "Failed to deactivate document:",
        err,
      )

      setActionError(
        err instanceof Error
          ? err.message
          : "Unable to deactivate document.",
      )
    } finally {
      setChangingDocumentId(
        null,
      )
    }
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <section className="mb-8 min-w-0">
        <p className="mb-1 text-sm font-medium text-blue-600">
          Admin workspace
        </p>

        <h2 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
          Compliance documents
        </h2>

        <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-500">
          Manage the policy and
          guideline documents used as
          reference material by the AI
          compliance checks.
        </p>
      </section>

      {campaignError && (
        <div className="mb-6 flex min-w-0 flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-700">
              Campaign access could
              not be refreshed.
            </p>

            <p className="mt-1 break-words text-xs text-red-600">
              {campaignError}
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-100 sm:w-fit"
            disabled={
              loadingCampaigns ||
              actionInProgress
            }
            onClick={() =>
              void loadCampaigns()
            }
          >
            <RefreshCw className="size-4" />

            Retry
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex min-w-0 items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />

          <p className="min-w-0 break-words text-sm text-emerald-700">
            {
              successMessage
            }
          </p>
        </div>
      )}

      {actionError && (
        <div className="mb-6 min-w-0 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <Card className="mb-6 min-w-0 border-slate-200 shadow-sm">
        <CardContent className="min-w-0 p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0 w-full md:max-w-xl">
              <label
                htmlFor="compliance-campaign"
                className="text-sm font-semibold"
              >
                Campaign
              </label>

              <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                Compliance documents
                are isolated per
                campaign.
              </p>

              <select
                id="compliance-campaign"
                value={
                  campaignId
                }
                disabled={
                  loadingCampaigns ||
                  loadingDocuments ||
                  actionInProgress
                }
                onChange={(
                  event,
                ) =>
                  handleCampaignChange(
                    event.target
                      .value,
                  )
                }
                className="mt-3 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="">
                  {loadingCampaigns &&
                  !hasLoadedCampaigns
                    ? "Loading campaigns..."
                    : campaigns.length ===
                        0
                      ? "No manageable campaigns"
                      : "Select campaign"}
                </option>

                {campaigns.map(
                  (
                    campaign,
                  ) => (
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

            <div className="min-w-0 flex flex-col gap-2 md:items-end">
              <p className="break-words text-xs leading-5 text-slate-400 md:text-right">
                Only campaigns where
                you are the owner or an
                Admin are shown.
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full md:w-fit"
                disabled={
                  loadingCampaigns ||
                  actionInProgress
                }
                onClick={() =>
                  void loadCampaigns()
                }
              >
                {loadingCampaigns ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}

                Refresh campaigns
              </Button>
            </div>
          </div>

          {selectedCampaign && (
            <div className="mt-4 min-w-0 rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Selected campaign
              </p>

              <p className="mt-1 break-words text-sm font-semibold">
                {
                  selectedCampaign.name
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!loadingCampaigns &&
        !campaignError &&
        hasLoadedCampaigns &&
        campaigns.length ===
          0 && (
          <Card className="mb-6 border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center sm:p-14">
              <ShieldCheck className="mx-auto size-11 text-slate-300" />

              <p className="mt-4 font-medium">
                No manageable
                campaigns
              </p>

              <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">
                Compliance documents
                can only be managed by
                the campaign owner or a
                user assigned the Admin
                role.
              </p>
            </CardContent>
          </Card>
        )}

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Documents"
          value={
            !campaignId
              ? "—"
              : metricsUnavailable
                ? "—"
                : documents.length
          }
        />

        <SummaryCard
          title="Active documents"
          value={
            !campaignId
              ? "—"
              : metricsUnavailable
                ? "—"
                : activeCount
          }
        />

        <SummaryCard
          title="Document types"
          value={
            documentTypes.length
          }
        />
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[430px_minmax(0,1fr)]">
        <Card className="min-w-0 h-fit border-slate-200 shadow-sm">
          <CardContent className="min-w-0 p-4 sm:p-6">
            <div className="flex size-12 items-center justify-center rounded-xl bg-blue-50">
              <Upload className="size-5 text-blue-600" />
            </div>

            <h3 className="mt-5 text-lg font-semibold">
              Upload new document
            </h3>

            <p className="mt-2 break-words text-sm leading-6 text-slate-500">
              Uploading a new version
              of a document type makes
              it the active version for
              future AI scoring.
            </p>

            {!campaignId && (
              <div className="mt-5 break-words rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
                Select a manageable
                campaign before
                uploading a compliance
                document.
              </div>
            )}

            <div className="mt-6 min-w-0">
              <label
                htmlFor="document-type"
                className="text-sm font-semibold"
              >
                Document type
              </label>

              <select
                id="document-type"
                value={
                  documentType
                }
                disabled={
                  !campaignId ||
                  actionInProgress
                }
                onChange={(
                  event,
                ) => {
                  setDocumentType(
                    event.target
                      .value as ComplianceDocumentType,
                  )

                  setActionError(
                    null,
                  )
                }}
                className="mt-2 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              >
                {documentTypes.map(
                  (
                    item,
                  ) => (
                    <option
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      {
                        item.label
                      }
                    </option>
                  ),
                )}
              </select>

              <p className="mt-2 break-words text-xs leading-5 text-slate-400">
                {
                  documentTypes.find(
                    (
                      item,
                    ) =>
                      item.value ===
                      documentType,
                  )?.description
                }
              </p>
            </div>

            <div className="mt-5 min-w-0">
              <label
                htmlFor="document-title"
                className="text-sm font-semibold"
              >
                Title
              </label>

              <input
                id="document-title"
                value={
                  title
                }
                disabled={
                  !campaignId ||
                  actionInProgress
                }
                onChange={(
                  event,
                ) => {
                  setTitle(
                    event.target
                      .value,
                  )

                  setActionError(
                    null,
                  )
                }}
                placeholder="e.g. Brand Guideline"
                className="mt-2 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-5 min-w-0">
              <label
                htmlFor="document-version"
                className="text-sm font-semibold"
              >
                Version
              </label>

              <input
                id="document-version"
                value={
                  version
                }
                disabled={
                  !campaignId ||
                  actionInProgress
                }
                onChange={(
                  event,
                ) => {
                  setVersion(
                    event.target
                      .value,
                  )

                  setActionError(
                    null,
                  )
                }}
                placeholder="e.g. v3.0"
                className="mt-2 h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-5 min-w-0">
              <label
                htmlFor="compliance-file"
                className="text-sm font-semibold"
              >
                Document file
              </label>

              <input
                id="compliance-file"
                type="file"
                accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                disabled={
                  !campaignId ||
                  actionInProgress
                }
                onChange={
                  handleFileChange
                }
                className="mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white p-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-medium"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Supported formats:
                PDF, TXT, MD and DOCX.
              </p>

              {file && (
                <div className="mt-3 min-w-0 rounded-xl bg-slate-50 p-3">
                  <p className="break-all text-sm font-medium sm:break-words">
                    {
                      file.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {Math.round(
                      file.size /
                        1024,
                    )}{" "}
                    KB
                  </p>
                </div>
              )}
            </div>

            <Button
              className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700"
              disabled={
                actionInProgress ||
                !campaignId ||
                !title.trim() ||
                !version.trim() ||
                !file
              }
              onClick={() =>
                void handleUpload()
              }
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />

                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4" />

                  Upload document
                </>
              )}
            </Button>

            <p className="mt-4 break-words text-center text-xs leading-5 text-slate-400">
              Uploader identity is
              taken from your signed-in
              session.
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="min-w-0 p-0">
            <div className="flex min-w-0 flex-col gap-4 border-b border-slate-100 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <ShieldCheck className="size-5 shrink-0 text-blue-600" />

                  <h3 className="break-words font-semibold">
                    Document library
                  </h3>
                </div>

                <p className="mt-2 break-words text-sm leading-6 text-slate-500">
                  Active versions are
                  used as AI compliance
                  references.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full shrink-0 sm:w-fit"
                disabled={
                  loadingDocuments ||
                  actionInProgress ||
                  !campaignId
                }
                onClick={() => {
                  if (
                    !campaignId
                  ) {
                    return
                  }

                  void loadDocuments(
                    Number(
                      campaignId,
                    ),
                  )
                }}
              >
                {loadingDocuments ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}

                Refresh
              </Button>
            </div>

            {!campaignId && (
              <div className="p-8 text-center sm:p-14">
                <ShieldCheck className="mx-auto size-11 text-slate-300" />

                <p className="mt-4 font-medium">
                  Select a campaign
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Choose a campaign to
                  view its compliance
                  document library.
                </p>
              </div>
            )}

            {campaignId &&
              loadingDocuments &&
              !hasLoadedDocuments && (
                <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500 sm:p-12">
                  <Loader2 className="size-4 animate-spin" />

                  Loading documents...
                </div>
              )}

            {campaignId &&
              documentError && (
                <div className="border-b border-red-100 bg-red-50 p-4 sm:p-5">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-red-700">
                        Document
                        library could
                        not be
                        refreshed.
                      </p>

                      <p className="mt-1 break-words text-xs text-red-600">
                        {
                          documentError
                        }
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-100 sm:w-fit"
                      disabled={
                        loadingDocuments ||
                        actionInProgress
                      }
                      onClick={() =>
                        void loadDocuments(
                          Number(
                            campaignId,
                          ),
                        )
                      }
                    >
                      <RefreshCw className="size-4" />

                      Retry
                    </Button>
                  </div>
                </div>
              )}

            {campaignId &&
              !loadingDocuments &&
              !documentError &&
              hasLoadedDocuments &&
              sortedDocuments.length ===
                0 && (
                <div className="p-8 text-center sm:p-14">
                  <FileText className="mx-auto size-11 text-slate-300" />

                  <p className="mt-4 font-medium">
                    No compliance
                    documents
                  </p>

                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                    Upload the first
                    policy or guideline
                    document for this
                    campaign.
                  </p>
                </div>
              )}

            {campaignId &&
              sortedDocuments.map(
                (
                  complianceDocument,
                  index,
                ) => {
                  const changing =
                    changingDocumentId ===
                    complianceDocument.id

                  return (
                    <div
                      key={
                        complianceDocument.id
                      }
                      className={`min-w-0 p-4 sm:p-6 ${
                        index !==
                        sortedDocuments.length -
                          1
                          ? "border-b border-slate-100"
                          : ""
                      }`}
                    >
                      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-3 sm:gap-4">
                          <div
                            className={`flex size-11 shrink-0 items-center justify-center rounded-xl sm:size-12 ${
                              complianceDocument.isActive
                                ? "bg-emerald-50"
                                : "bg-slate-100"
                            }`}
                          >
                            <FileText
                              className={`size-5 ${
                                complianceDocument.isActive
                                  ? "text-emerald-600"
                                  : "text-slate-400"
                              }`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <p className="max-w-full break-words font-semibold">
                                {
                                  complianceDocument.title
                                }
                              </p>

                              {complianceDocument.isActive ? (
                                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                  Active
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                                  Inactive
                                </span>
                              )}
                            </div>

                            <p className="mt-2 break-words text-sm text-slate-500">
                              {getDocumentTypeLabel(
                                complianceDocument.documentType,
                              )}
                            </p>

                            <div className="mt-3 flex min-w-0 flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:flex-wrap sm:gap-x-5">
                              <span className="break-words">
                                Version:{" "}
                                <strong className="font-medium text-slate-600">
                                  {
                                    complianceDocument.version
                                  }
                                </strong>
                              </span>

                              <span className="break-words">
                                Document ID:{" "}
                                <strong className="font-medium text-slate-600">
                                  {
                                    complianceDocument.id
                                  }
                                </strong>
                              </span>

                              <span className="break-words">
                                Uploaded:{" "}
                                {new Date(
                                  complianceDocument.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>

                            {complianceDocument.fileName && (
                              <p className="mt-2 max-w-full break-all text-xs leading-5 text-slate-400 sm:break-words">
                                {
                                  complianceDocument.fileName
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="w-full shrink-0 lg:w-auto">
                          {complianceDocument.isActive ? (
                            <Button
                              variant="outline"
                              className="w-full lg:w-auto"
                              disabled={
                                actionInProgress
                              }
                              onClick={() =>
                                void handleDeactivate(
                                  complianceDocument.id,
                                )
                              }
                            >
                              {changing ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <PowerOff className="size-4" />
                              )}

                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 lg:w-auto"
                              disabled={
                                actionInProgress
                              }
                              onClick={() =>
                                void handleActivate(
                                  complianceDocument.id,
                                )
                              }
                            >
                              {changing ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Power className="size-4" />
                              )}

                              Activate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                },
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  value,
}: {
  title: string
  value: number | string
}) {
  return (
    <Card className="min-w-0 border-slate-200 shadow-sm">
      <CardContent className="min-w-0 p-4 sm:p-5">
        <p className="break-words text-sm text-slate-500">
          {title}
        </p>

        <p className="mt-2 text-2xl font-semibold">
          {value}
        </p>
      </CardContent>
    </Card>
  )
}