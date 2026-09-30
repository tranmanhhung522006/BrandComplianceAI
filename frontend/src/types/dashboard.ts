export type AssetStatus =
  | "DRAFT"
  | "SCORING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "RELEASED"

export type ScoringJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"

export type CheckType =
  | "FOREIGN_LOGO"
  | "BRAND_COMPLIANCE"
  | "MAS_ADVERTISING"

export type ReviewDecision =
  | "APPROVED"
  | "REJECTED"

export type CheckDecision =
  | "ACCEPT_AI"
  | "OVERRIDE_PASS"
  | "OVERRIDE_FAIL"

export type ComplianceDocumentType =
  | "FOREIGN_LOGO_POLICY"
  | "BRAND_GUIDELINE"
  | "MAS_RULES"

export type CampaignRole =
  | "MAKER"
  | "CHECKER"
  | "ADMIN"

export interface BackendUser {
  id: number
  email: string
  name: string | null
  createdAt?: string
  updatedAt?: string
}

export interface BackendCampaignMember {
  id: number
  campaignId: number
  userId: number
  role: CampaignRole
  createdAt: string
  user?: BackendUser
}

export interface BackendCampaign {
  id: number
  name: string
  description?: string | null
  deadline?: string | null
  ownerId: number
  createdAt: string
  updatedAt: string
  owner?: BackendUser
  members?: BackendCampaignMember[]
}

export interface BackendAssetSummary {
  id: number
  name: string
  description?: string | null
  campaignId: number
  createdById: number
  createdAt: string
  updatedAt: string
}

export interface BackendAsset
  extends BackendAssetSummary {
  campaign: BackendCampaign
  createdBy: BackendUser
  versions: BackendAssetVersion[]
}

export interface BackendAssetVersion {
  id: number
  versionNumber: number
  fileName: string
  fileUrl: string
  mimeType?: string | null
  fileSize?: number | null
  status: AssetStatus
  assetId: number
  uploadedById: number
  createdAt: string
  updatedAt: string
}

export interface AiCheckResult {
  id: number
  assetVersionId?: number
  scoringJobId?: number
  checkType: CheckType
  score: number
  reason: string
  ruleReference: string | null
  sourceQuote?: string | null
  uncertainty?: string | null
  modelName?: string | null
  modelVersion?: string | null
  promptVersion?: string | null
  createdAt: string
}

export interface ScoringJob {
  id: number
  assetVersionId: number
  status: ScoringJobStatus
  retryCount: number
  errorMessage?: string | null
  createdAt: string
  startedAt?: string | null
  completedAt?: string | null
  results?: AiCheckResult[]
}

export interface VersionScoringResponse
  extends BackendAssetVersion {
  asset?: BackendAssetSummary
  scoringJobs?: ScoringJob[]
  aiCheckResults?: AiCheckResult[]
}

export interface ReviewQueueAsset
  extends BackendAssetSummary {
  campaign: BackendCampaign
}

export interface ReviewQueueVersion
  extends BackendAssetVersion {
  asset: ReviewQueueAsset
  aiCheckResults: AiCheckResult[]
}

export interface ReviewCheckDecisionInput {
  aiCheckResultId: number
  decision: CheckDecision
  comment?: string
}

export interface SubmitReviewInput {
  checkerId: number
  decision: ReviewDecision
  comment?: string
  checkDecisions: ReviewCheckDecisionInput[]
}

export interface ReleaseVersionInput {
  adminId: number
  releasedById?: number
  note?: string
}

export interface BackendRelease {
  id?: number
  assetVersionId?: number
  releasedById?: number
  releasedAt?: string
  createdAt?: string
  note?: string | null
}

export interface ReleaseNotification {
  id: number
  userId: number
  campaignId: number
  type: string
  title: string
  message: string
  assetId?: number | null
  assetVersionId?: number | null
  isRead: boolean
  readAt?: string | null
  createdAt: string
}

export interface ReleaseVersionResponse {
  message: string
  release: BackendRelease
  version: BackendAssetVersion | null
  notification: ReleaseNotification
  auditLog: unknown
}

export interface BackendComplianceDocument {
  id: number
  title: string
  documentType: ComplianceDocumentType
  version: string
  isActive: boolean
  campaignId?: number | null
  uploadedById?: number | null
  openaiFileId?: string | null
  fileName?: string | null
  fileUrl?: string | null
  mimeType?: string | null
  fileSize?: number | null
  createdAt: string
  updatedAt: string
}
