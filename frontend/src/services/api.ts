import type {
  BackendAsset,
  BackendCampaign,
  BackendAssetVersion,
  BackendComplianceDocument,
  BackendRelease,
  ComplianceDocumentType,
  ReleaseNotification,
  ReleaseVersionInput,
  ReleaseVersionResponse,
  ReviewQueueVersion,
  ScoringJob,
  SubmitReviewInput,
  VersionScoringResponse,
} from "@/types/dashboard"

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "/api"

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    },
  )

  if (!response.ok) {
    const message = await response.text()

    throw new Error(
      message ||
        `Request failed with status ${response.status}`,
    )
  }

  return response.json() as Promise<T>
}

export interface UploadVersionResponse {
  message: string
  version: BackendAssetVersion
  scoringJob: ScoringJob
}

export interface CreateAssetInput {
  name: string
  description?: string
  campaignId: number
}

export interface CreateCampaignInput {
  name: string
  description?: string
  deadline?: string | null
}

export interface UpdateCampaignInput {
  name?: string
  description?: string | null
  deadline?: string | null
}

export interface UploadComplianceDocumentInput {
  campaignId: number
  title: string
  documentType: ComplianceDocumentType
  version: string
  file: File
}

export type AuthenticatedSubmitReviewInput =
  Omit<
    SubmitReviewInput,
    "checkerId"
  >

export type AuthenticatedReleaseVersionInput =
  Omit<
    ReleaseVersionInput,
    "adminId" | "releasedById"
  >

export interface AuditLogRecord {
  [key: string]: unknown
}

export function getCampaigns() {
  return request<BackendCampaign[]>(
    "/campaigns",
  )
}

export function createCampaign(
  input: CreateCampaignInput,
) {
  return request<BackendCampaign>(
    "/campaigns",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  )
}

export function updateCampaign(
  campaignId: number,
  input: UpdateCampaignInput,
) {
  return request<BackendCampaign>(
    `/campaigns/${campaignId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  )
}

export function getAssets() {
  return request<BackendAsset[]>(
    "/assets",
  )
}

export function createAsset(
  input: CreateAssetInput,
) {
  return request<BackendAsset>(
    "/assets",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  )
}

export function getVersionScoring(
  versionId: number,
) {
  return request<VersionScoringResponse>(
    `/scoring/versions/${versionId}`,
  )
}

export function getReviewQueue() {
  return request<ReviewQueueVersion[]>(
    "/reviews/queue",
  )
}

export function submitReview(
  versionId: number,
  input: AuthenticatedSubmitReviewInput,
) {
  return request<unknown>(
    `/reviews/versions/${versionId}`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  )
}

export function releaseVersion(
  versionId: number,
  input: AuthenticatedReleaseVersionInput,
) {
  return request<ReleaseVersionResponse>(
    `/releases/versions/${versionId}`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  )
}

export function getVersionRelease(
  versionId: number,
) {
  return request<BackendRelease>(
    `/releases/versions/${versionId}`,
  )
}

export function getReleaseNotifications(
  campaignId?: number,
) {
  const query =
    campaignId
      ? `?campaignId=${campaignId}`
      : ""

  return request<ReleaseNotification[]>(
    `/releases/notifications${query}`,
  )
}

export function markReleaseNotificationRead(
  notificationId: number,
) {
  return request<ReleaseNotification>(
    `/releases/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    },
  )
}

export function getComplianceDocuments(
  campaignId: number,
) {
  return request<BackendComplianceDocument[]>(
    `/compliance-documents?campaignId=${campaignId}`,
  )
}

export async function uploadComplianceDocument(
  input: UploadComplianceDocumentInput,
) {
  const formData =
    new FormData()

  formData.append(
    "file",
    input.file,
  )

  formData.append(
    "campaignId",
    String(input.campaignId),
  )

  formData.append(
    "title",
    input.title,
  )

  formData.append(
    "documentType",
    input.documentType,
  )

  formData.append(
    "version",
    input.version,
  )

  const response =
    await fetch(
      `${API_BASE_URL}/compliance-documents`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      },
    )

  if (!response.ok) {
    const message =
      await response.text()

    throw new Error(
      message ||
        `Upload failed with status ${response.status}`,
    )
  }

  return response.json() as Promise<unknown>
}

export function activateComplianceDocument(
  documentId: number,
) {
  return request<unknown>(
    `/compliance-documents/${documentId}/activate`,
    {
      method: "PATCH",
    },
  )
}

export function deactivateComplianceDocument(
  documentId: number,
) {
  return request<unknown>(
    `/compliance-documents/${documentId}/deactivate`,
    {
      method: "PATCH",
    },
  )
}

export function getAuditLogs() {
  return request<AuditLogRecord[]>(
    "/audit",
  )
}

export function getEntityAuditLogs(
  entityType: string,
  entityId: number,
) {
  return request<AuditLogRecord[]>(
    `/audit/${entityType}/${entityId}`,
  )
}

export async function uploadAssetVersion(
  assetId: number,
  file: File,
): Promise<UploadVersionResponse> {
  const formData =
    new FormData()

  formData.append(
    "file",
    file,
  )

  const response =
    await fetch(
      `${API_BASE_URL}/assets/${assetId}/versions`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      },
    )

  if (!response.ok) {
    const message =
      await response.text()

    throw new Error(
      message ||
        `Upload failed with status ${response.status}`,
    )
  }

  return response.json() as Promise<UploadVersionResponse>
}

export async function openAssetVersionFile(
  versionId: number,
) {
  const previewWindow =
    window.open(
      "",
      "_blank",
    )

  try {
    const response =
      await fetch(
        `${API_BASE_URL}/assets/versions/${versionId}/file`,
        {
          credentials: "include",
        },
      )

    if (!response.ok) {
      const message =
        await response.text()

      throw new Error(
        message ||
          `Unable to open file (${response.status})`,
      )
    }

    const blob =
      await response.blob()

    const blobUrl =
      URL.createObjectURL(blob)

    if (!previewWindow) {
      URL.revokeObjectURL(blobUrl)

      throw new Error(
        "The browser blocked the preview window.",
      )
    }

    previewWindow.location.href =
      blobUrl

    window.setTimeout(
      () => {
        URL.revokeObjectURL(blobUrl)
      },
      60_000,
    )
  } catch (error) {
    previewWindow?.close()
    throw error
  }
}
