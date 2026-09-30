const API_URL =
  import.meta.env.VITE_API_URL ??
  "/api"

export type CampaignRole =
  | "MAKER"
  | "CHECKER"
  | "ADMIN"

export interface TeamUser {
  id: number
  email: string
  name: string | null
}

export interface CampaignTeamMember {
  id: number
  campaignId: number
  userId: number
  role: CampaignRole
  isOwner: boolean
  user: TeamUser
  createdAt: string
}

export interface CampaignTeamResponse {
  campaign: {
    id: number
    name: string

    owner: TeamUser & {
      role: "OWNER"
    }
  }

  members: CampaignTeamMember[]
}

interface MemberMutationResponse {
  message: string
  member?: CampaignTeamMember
}

async function getErrorMessage(
  response: Response,
) {
  const data =
    await response
      .json()
      .catch(() => null)

  if (
    data?.message
  ) {
    if (
      Array.isArray(
        data.message,
      )
    ) {
      return data.message.join(
        ", ",
      )
    }

    return String(
      data.message,
    )
  }

  return `Request failed (${response.status})`
}

export async function getCampaignMembers(
  campaignId: number,
): Promise<CampaignTeamResponse> {
  const response =
    await fetch(
      `${API_URL}/campaigns/${campaignId}/members`,
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

export async function addCampaignMember(
  campaignId: number,
  body: {
    email: string
    role: CampaignRole
  },
): Promise<MemberMutationResponse> {
  const response =
    await fetch(
      `${API_URL}/campaigns/${campaignId}/members`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify(
            body,
          ),
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

export async function updateCampaignMemberRole(
  campaignId: number,
  memberId: number,
  role: CampaignRole,
): Promise<MemberMutationResponse> {
  const response =
    await fetch(
      `${API_URL}/campaigns/${campaignId}/members/${memberId}`,
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify({
            role,
          }),
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

export async function removeCampaignMember(
  campaignId: number,
  memberId: number,
): Promise<{
  message: string
}> {
  const response =
    await fetch(
      `${API_URL}/campaigns/${campaignId}/members/${memberId}`,
      {
        method:
          "DELETE",

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