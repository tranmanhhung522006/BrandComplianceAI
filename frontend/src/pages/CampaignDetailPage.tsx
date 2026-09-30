import {
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  FileCheck2,
  FileImage,
  FileText,
  FolderKanban,
  Layers3,
  Pencil,
  Plus,
  Save,
  UserRound,
  Users,
  X,
} from "lucide-react"

import {
  useNavigate,
  useParams,
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

import {
  getLatestVersion,
} from "@/lib/assets"

import {
  getAssets,
  getCampaigns,
  getComplianceDocuments,
  getReleaseNotifications,
  markReleaseNotificationRead,
  updateCampaign,
} from "@/services/api"

import type {
  AssetStatus,
  BackendAsset,
  BackendCampaign,
  BackendComplianceDocument,
  ComplianceDocumentType,
  ReleaseNotification,
} from "@/types/dashboard"

const guidelineTypes: {
  type: ComplianceDocumentType
  label: string
}[] = [
  {
    type: "FOREIGN_LOGO_POLICY",
    label: "Foreign Logo Policy",
  },
  {
    type: "BRAND_GUIDELINE",
    label: "Brand Guideline",
  },
  {
    type: "MAS_RULES",
    label: "MAS Advertising Rules",
  },
]

function toDateInputValue(
  value?: string | null,
) {
  if (!value) {
    return ""
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ""
  }

  return date
    .toISOString()
    .slice(0, 10)
}

export function CampaignDetailPage() {
  const navigate =
    useNavigate()

  const {
    campaignId,
  } =
    useParams()

  const {
    user,
  } =
    useAuth()

  const [
    campaign,
    setCampaign,
  ] =
    useState<
      BackendCampaign | null
    >(null)

  const [
    assets,
    setAssets,
  ] =
    useState<BackendAsset[]>([])

  const [
    complianceDocuments,
    setComplianceDocuments,
  ] =
    useState<
      BackendComplianceDocument[]
    >([])

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      ReleaseNotification[]
    >([])

  const [
    markingNotificationId,
    setMarkingNotificationId,
  ] =
    useState<number | null>(
      null,
    )

  const [
    editing,
    setEditing,
  ] =
    useState(false)

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    editName,
    setEditName,
  ] =
    useState("")

  const [
    editDescription,
    setEditDescription,
  ] =
    useState("")

  const [
    editDeadline,
    setEditDeadline,
  ] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(
      null,
    )

  useEffect(() => {
    async function loadCampaign() {
      try {
        setLoading(true)

        const numericCampaignId =
          Number(campaignId)

        if (
          !Number.isInteger(
            numericCampaignId,
          ) ||
          numericCampaignId <= 0
        ) {
          throw new Error(
            "Invalid campaign ID.",
          )
        }

        const [
          campaignData,
          assetData,
          documentData,
          notificationData,
        ] =
          await Promise.all([
            getCampaigns(),
            getAssets(),
            getComplianceDocuments(
              numericCampaignId,
            ),
            getReleaseNotifications(
              numericCampaignId,
            ),
          ])

        const selectedCampaign =
          campaignData.find(
            (item) =>
              item.id ===
              numericCampaignId,
          )

        if (!selectedCampaign) {
          throw new Error(
            "Campaign not found.",
          )
        }

        setCampaign(
          selectedCampaign,
        )

        setEditName(
          selectedCampaign.name,
        )

        setEditDescription(
          selectedCampaign.description ??
            "",
        )

        setEditDeadline(
          toDateInputValue(
            selectedCampaign.deadline,
          ),
        )

        setAssets(
          assetData.filter(
            (asset) =>
              asset.campaignId ===
              numericCampaignId,
          ),
        )

        setComplianceDocuments(
          documentData,
        )

        setNotifications(
          notificationData,
        )

        setError(null)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load campaign.",
        )
      } finally {
        setLoading(false)
      }
    }

    void loadCampaign()
  }, [campaignId])

  const canEdit =
    useMemo(() => {
      if (
        !campaign ||
        !user
      ) {
        return false
      }

      if (
        campaign.ownerId ===
        user.id
      ) {
        return true
      }

      return Boolean(
        campaign.members?.some(
          (member) =>
            member.userId ===
              user.id &&
            member.role ===
              "ADMIN",
        ),
      )
    }, [campaign, user])

  const totalVersions =
    useMemo(() => {
      return assets.reduce(
        (total, asset) =>
          total +
          asset.versions.length,
        0,
      )
    }, [assets])

  const progress =
    useMemo(() => {
      const counts: Record<
        | "WAITING"
        | "SCORING"
        | "IN_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "RELEASED",
        number
      > = {
        WAITING: 0,
        SCORING: 0,
        IN_REVIEW: 0,
        APPROVED: 0,
        REJECTED: 0,
        RELEASED: 0,
      }

      assets.forEach(
        (asset) => {
          const latest =
            getLatestVersion(
              asset,
            )

          if (
            !latest ||
            latest.status ===
              "DRAFT"
          ) {
            counts.WAITING += 1
            return
          }

          if (
            latest.status ===
            "SCORING"
          ) {
            counts.SCORING += 1
            return
          }

          counts[
            latest.status as Exclude<
              AssetStatus,
              "DRAFT" | "SCORING"
            >
          ] += 1
        },
      )

      return counts
    }, [assets])

  const activeDocuments =
    useMemo(() => {
      return complianceDocuments.filter(
        (document) =>
          document.isActive,
      )
    }, [complianceDocuments])

  const unreadNotifications =
    useMemo(() => {
      return notifications.filter(
        (notification) =>
          !notification.isRead,
      ).length
    }, [notifications])

  async function handleSaveCampaign() {
    if (
      !campaign ||
      !editName.trim()
    ) {
      setError(
        "Campaign name is required.",
      )
      return
    }

    try {
      setSaving(true)
      setError(null)

      const updated =
        await updateCampaign(
          campaign.id,
          {
            name:
              editName.trim(),

            description:
              editDescription.trim() ||
              null,

            deadline:
              editDeadline ||
              null,
          },
        )

      setCampaign(updated)
      setEditName(updated.name)
      setEditDescription(
        updated.description ??
          "",
      )
      setEditDeadline(
        toDateInputValue(
          updated.deadline,
        ),
      )
      setEditing(false)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update campaign.",
      )
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    if (!campaign) {
      return
    }

    setEditName(
      campaign.name,
    )
    setEditDescription(
      campaign.description ??
        "",
    )
    setEditDeadline(
      toDateInputValue(
        campaign.deadline,
      ),
    )
    setEditing(false)
    setError(null)
  }

  async function handleMarkNotificationRead(
    notificationId: number,
  ) {
    try {
      setMarkingNotificationId(
        notificationId,
      )

      const updated =
        await markReleaseNotificationRead(
          notificationId,
        )

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id ===
              updated.id
                ? updated
                : notification,
          ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notification.",
      )
    } finally {
      setMarkingNotificationId(
        null,
      )
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-sm text-slate-500">
        Loading campaign...
      </div>
    )
  }

  if (
    error &&
    !campaign
  ) {
    return (
      <div className="p-8">
        <Button
          variant="outline"
          onClick={() =>
            navigate(
              "/campaigns",
            )
          }
        >
          <ArrowLeft className="size-4" />
          Back to campaigns
        </Button>

        <p className="mt-6 text-sm text-red-500">
          {error}
        </p>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  return (
    <div className="mx-auto max-w-[1500px] p-6 lg:p-8">
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

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div>
          <p className="mb-2 text-sm font-medium text-blue-600">
            Campaign
          </p>

          <h2 className="text-3xl font-semibold tracking-tight">
            {campaign.name}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {campaign.description ??
              "No campaign description."}
          </p>

          <div className="mt-5 flex flex-wrap gap-5 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <UserRound className="size-4" />

              <span>
                Owner:{" "}
                <strong className="font-medium text-slate-700">
                  {campaign.owner?.name ??
                    campaign.owner?.email ??
                    `User ${campaign.ownerId}`}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="size-4" />

              <span>
                {campaign.deadline
                  ? new Date(
                      campaign.deadline,
                    ).toLocaleDateString()
                  : "No deadline"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-fit flex-wrap gap-3">
          {canEdit && (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                setEditing(
                  (current) =>
                    !current,
                )
              }
            >
              <Pencil className="size-4" />
              Edit campaign
            </Button>
          )}

          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() =>
              navigate(
                `/campaigns/${campaign.id}/team`,
              )
            }
          >
            <Users className="size-4" />
            Manage Team
          </Button>

          <Button
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
            onClick={() =>
              navigate(
                `/assets/new?campaignId=${campaign.id}`,
              )
            }
          >
            <Plus className="size-4" />
            New asset
          </Button>
        </div>
      </section>

      {editing && (
        <Card className="mb-8 border-blue-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">
                  Edit campaign details
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Owner or campaign Admin can update name, description and deadline.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={cancelEdit}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <label className="text-sm font-semibold">
                  Campaign name
                </label>

                <input
                  value={editName}
                  disabled={saving}
                  onChange={(event) =>
                    setEditName(
                      event.target.value,
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">
                  Deadline
                </label>

                <input
                  type="date"
                  value={editDeadline}
                  disabled={saving}
                  onChange={(event) =>
                    setEditDeadline(
                      event.target.value,
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold">
                Description
              </label>

              <textarea
                rows={4}
                value={editDescription}
                disabled={saving}
                onChange={(event) =>
                  setEditDescription(
                    event.target.value,
                  )
                }
                className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={saving}
                onClick={cancelEdit}
              >
                Cancel
              </Button>

              <Button
                disabled={
                  saving ||
                  !editName.trim()
                }
                onClick={() =>
                  void handleSaveCampaign()
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="size-4" />
                {saving
                  ? "Saving..."
                  : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Assets"
          value={String(
            assets.length,
          )}
          description="Marketing assets in this campaign"
          icon={FileImage}
        />

        <MetricCard
          title="Total Versions"
          value={String(
            totalVersions,
          )}
          description="All uploaded revisions"
          icon={Layers3}
        />

        <MetricCard
          title="In Review"
          value={String(
            progress.IN_REVIEW,
          )}
          description="Waiting for Checker review"
          icon={ClipboardCheck}
        />

        <MetricCard
          title="Released"
          value={String(
            progress.RELEASED,
          )}
          description="Latest versions released"
          icon={FileCheck2}
        />
      </section>

      <Card className="mt-6 border-slate-200 shadow-sm">
        <CardContent className="p-6">
          <div>
            <h3 className="font-semibold">
              Progress summary
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Counts use the current/latest state of each Asset.
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <ProgressItem
              label="Waiting"
              value={progress.WAITING}
            />
            <ProgressItem
              label="Scoring"
              value={progress.SCORING}
            />
            <ProgressItem
              label="In review"
              value={progress.IN_REVIEW}
            />
            <ProgressItem
              label="Approved"
              value={progress.APPROVED}
            />
            <ProgressItem
              label="Rejected"
              value={progress.REJECTED}
            />
            <ProgressItem
              label="Released"
              value={progress.RELEASED}
            />
          </div>
        </CardContent>
      </Card>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="font-semibold">
                  Campaign assets
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Every Asset is shown with its current/latest status.
                </p>
              </div>

              <Button
                variant="ghost"
                className="text-blue-600"
                onClick={() =>
                  navigate(
                    `/assets/new?campaignId=${campaign.id}`,
                  )
                }
              >
                <Plus className="size-4" />
                Add asset
              </Button>
            </div>

            {assets.length === 0 ? (
              <div className="p-12 text-center">
                <FolderKanban className="mx-auto size-10 text-slate-300" />

                <p className="mt-4 font-medium">
                  No assets yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Create the first marketing asset for this campaign.
                </p>
              </div>
            ) : (
              assets.map(
                (asset, index) => {
                  const latestVersion =
                    getLatestVersion(
                      asset,
                    )

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/assets/${asset.id}`,
                        )
                      }
                      className={`flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-slate-50 ${
                        index !==
                        assets.length - 1
                          ? "border-b border-slate-100"
                          : ""
                      }`}
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                        <FileImage className="size-5 text-slate-500" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {asset.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {asset.description ??
                            "No description"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {asset.versions.length}{" "}
                          version
                          {asset.versions.length === 1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      <div className="hidden items-center gap-6 md:flex">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">
                            Latest
                          </p>

                          <p className="mt-1 text-sm font-medium">
                            {latestVersion
                              ? `v${latestVersion.versionNumber}`
                              : "No versions"}
                          </p>
                        </div>

                        {latestVersion ? (
                          <StatusBadge
                            status={
                              latestVersion.status
                            }
                          />
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            WAITING
                          </span>
                        )}

                        <ArrowRight className="size-4 text-slate-400" />
                      </div>

                      <ArrowRight className="size-4 shrink-0 text-slate-400 md:hidden" />
                    </button>
                  )
                },
              )
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50">
                  <FileText className="size-5 text-violet-600" />
                </div>

                <div>
                  <h3 className="font-semibold">
                    Active guidelines
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Active versions used by AI for this campaign.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {guidelineTypes.map(
                  (guideline) => {
                    const document =
                      activeDocuments.find(
                        (item) =>
                          item.documentType ===
                          guideline.type,
                      )

                    return (
                      <div
                        key={guideline.type}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <p className="text-xs font-medium text-slate-500">
                          {guideline.label}
                        </p>

                        {document ? (
                          <>
                            <p className="mt-1 text-sm font-semibold">
                              {document.title}
                            </p>

                            <p className="mt-1 text-xs text-emerald-600">
                              Active version {document.version}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-sm text-amber-600">
                            Not provided
                          </p>
                        )}
                      </div>
                    )
                  },
                )}
              </div>
            </CardContent>
          </Card>

          {notifications.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    {unreadNotifications > 0 ? (
                      <BellRing className="size-5 text-blue-600" />
                    ) : (
                      <Bell className="size-5 text-slate-500" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      Release notifications
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {unreadNotifications}{" "}
                      unread
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {notifications
                    .slice(0, 8)
                    .map(
                      (notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-xl border p-4 ${
                            notification.isRead
                              ? "border-slate-200 bg-white"
                              : "border-blue-200 bg-blue-50/60"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">
                                {notification.title}
                              </p>

                              <p className="mt-1 break-words text-xs leading-5 text-slate-600">
                                {notification.message}
                              </p>

                              <p className="mt-2 text-[11px] text-slate-400">
                                {new Date(
                                  notification.createdAt,
                                ).toLocaleString()}
                              </p>
                            </div>

                            {!notification.isRead && (
                              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                New
                              </span>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {notification.assetId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    `/assets/${notification.assetId}`,
                                  )
                                }
                              >
                                View asset
                              </Button>
                            )}

                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={
                                  markingNotificationId ===
                                  notification.id
                                }
                                onClick={() =>
                                  void handleMarkNotificationRead(
                                    notification.id,
                                  )
                                }
                              >
                                Mark as read
                              </Button>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50">
                <FolderKanban className="size-5 text-blue-600" />
              </div>

              <h3 className="mt-5 font-semibold">
                Campaign summary
              </h3>

              <div className="mt-5 space-y-4">
                <DetailRow
                  label="Campaign ID"
                  value={String(
                    campaign.id,
                  )}
                />

                <DetailRow
                  label="Owner"
                  value={
                    campaign.owner?.name ??
                    campaign.owner?.email ??
                    `User ${campaign.ownerId}`
                  }
                />

                <DetailRow
                  label="Deadline"
                  value={
                    campaign.deadline
                      ? new Date(
                          campaign.deadline,
                        ).toLocaleDateString()
                      : "No deadline"
                  }
                />

                <DetailRow
                  label="Assets"
                  value={String(
                    assets.length,
                  )}
                />

                <DetailRow
                  label="Versions"
                  value={String(
                    totalVersions,
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-slate-950 text-white shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Workflow
              </p>

              <div className="mt-5 space-y-4">
                <WorkflowStep number="1" label="Create asset" />
                <WorkflowStep number="2" label="Upload artwork" />
                <WorkflowStep number="3" label="AI compliance checks" />
                <WorkflowStep number="4" label="Checker review" />
                <WorkflowStep number="5" label="Admin release" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function ProgressItem({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold">
        {value}
      </p>
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
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold">
        {value}
      </span>
    </div>
  )
}

function WorkflowStep({
  number,
  label,
}: {
  number: string
  label: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
        {number}
      </div>

      <p className="text-sm text-slate-300">
        {label}
      </p>
    </div>
  )
}
