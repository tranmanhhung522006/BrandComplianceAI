import type {
  AiCheckResult,
  CheckDecision,
  ReviewDecision,
} from "@/types/dashboard"

const API_URL =
  import.meta.env.VITE_API_URL ??
  "/api"

export interface HistoricalReviewer {
  id: number
  email: string
  name: string | null
}

export interface HistoricalCheckDecision {
  id: number
  reviewId: number
  aiCheckResultId: number
  decision: CheckDecision
  comment?: string | null
  createdAt?: string
  aiCheckResult?: AiCheckResult
}

export interface HistoricalReview {
  id: number
  assetVersionId: number
  checkerId: number
  decision: ReviewDecision
  comment?: string | null
  createdAt: string
  checker: HistoricalReviewer
  checkDecisions: HistoricalCheckDecision[]
}

export interface HistoricalRelease {
  id?: number
  assetVersionId?: number
  releasedById?: number
  note?: string | null
  createdAt?: string
}

async function getErrorMessage(
  response: Response,
) {
  const text =
    await response.text()

  if (!text) {
    return `Request failed (${response.status})`
  }

  try {
    const parsed =
      JSON.parse(text)

    if (
      parsed &&
      typeof parsed.message ===
        "string"
    ) {
      return parsed.message
    }
  } catch {
    // Response was plain text.
  }

  return text
}

export async function getVersionReviews(
  versionId: number,
): Promise<HistoricalReview[]> {
  const response =
    await fetch(
      `${API_URL}/reviews/versions/${versionId}`,
      {
        credentials:
          "include",
      },
    )

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return response.json()
}

export async function getHistoricalRelease(
  versionId: number,
): Promise<HistoricalRelease | null> {
  const response =
    await fetch(
      `${API_URL}/releases/versions/${versionId}`,
      {
        credentials:
          "include",
      },
    )

  if (
    response.status === 404
  ) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
      ),
    )
  }

  return response.json()
}