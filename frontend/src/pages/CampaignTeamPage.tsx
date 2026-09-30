import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react"

import {
  useNavigate,
  useParams,
} from "react-router-dom"

import {
  Button,
} from "@/components/ui/button"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

import {
  useAuth,
} from "@/context/AuthContext"

import {
  addCampaignMember,
  getCampaignMembers,
  removeCampaignMember,
  updateCampaignMemberRole,
} from "@/services/team-api"

import type {
  CampaignRole,
  CampaignTeamResponse,
} from "@/services/team-api"

export function CampaignTeamPage() {
  const {
    campaignId,
  } =
    useParams()

  const navigate =
    useNavigate()

  const {
    user,
  } =
    useAuth()

  const [
    team,
    setTeam,
  ] =
    useState<CampaignTeamResponse | null>(
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

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null,
    )

  const [
    email,
    setEmail,
  ] =
    useState("")

  const [
    newRole,
    setNewRole,
  ] =
    useState<CampaignRole>(
      "CHECKER",
    )

  const [
    adding,
    setAdding,
  ] =
    useState(false)

  const [
    busyMemberId,
    setBusyMemberId,
  ] =
    useState<number | null>(
      null,
    )

  const numericCampaignId =
    Number(
      campaignId,
    )

  const loadTeam =
    useCallback(
      async () => {
        if (
          !Number.isInteger(
            numericCampaignId,
          ) ||
          numericCampaignId <= 0
        ) {
          setError(
            "Invalid campaign ID.",
          )

          setLoading(
            false,
          )

          return
        }

        try {
          setLoading(
            true,
          )

          setError(
            null,
          )

          const data =
            await getCampaignMembers(
              numericCampaignId,
            )

          setTeam(
            data,
          )
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load campaign team.",
          )
        } finally {
          setLoading(
            false,
          )
        }
      },
      [
        numericCampaignId,
      ],
    )

  useEffect(() => {
    void loadTeam()
  }, [
    loadTeam,
  ])

  const canManage =
    useMemo(
      () => {
        if (
          !team ||
          !user
        ) {
          return false
        }

        if (
          team.campaign
            .owner.id ===
          user.id
        ) {
          return true
        }

        return team.members.some(
          (member) =>
            member.userId ===
              user.id &&
            member.role ===
              "ADMIN",
        )
      },
      [
        team,
        user,
      ],
    )

  const orderedMembers =
    useMemo(
      () => {
        if (!team) {
          return []
        }

        return [
          ...team.members,
        ].sort(
          (a, b) => {
            if (
              a.isOwner &&
              !b.isOwner
            ) {
              return -1
            }

            if (
              !a.isOwner &&
              b.isOwner
            ) {
              return 1
            }

            return (
              a.user.name ??
              a.user.email
            ).localeCompare(
              b.user.name ??
                b.user.email,
            )
          },
        )
      },
      [
        team,
      ],
    )

  async function handleAddMember() {
    const normalizedEmail =
      email.trim()

    if (!normalizedEmail) {
      setError(
        "Please enter the user's email.",
      )

      return
    }

    try {
      setAdding(
        true,
      )

      setError(
        null,
      )

      setSuccess(
        null,
      )

      const result =
        await addCampaignMember(
          numericCampaignId,
          {
            email:
              normalizedEmail,

            role:
              newRole,
          },
        )

      setEmail(
        "",
      )

      setSuccess(
        result.message,
      )

      await loadTeam()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add member.",
      )
    } finally {
      setAdding(
        false,
      )
    }
  }

  async function handleRoleChange(
    memberId: number,
    role: CampaignRole,
  ) {
    try {
      setBusyMemberId(
        memberId,
      )

      setError(
        null,
      )

      setSuccess(
        null,
      )

      const result =
        await updateCampaignMemberRole(
          numericCampaignId,
          memberId,
          role,
        )

      setSuccess(
        result.message,
      )

      await loadTeam()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change member role.",
      )

      await loadTeam()
    } finally {
      setBusyMemberId(
        null,
      )
    }
  }

  async function handleRemoveMember(
    memberId: number,
    memberName: string,
  ) {
    const confirmed =
      window.confirm(
        `Remove ${memberName} from this campaign?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setBusyMemberId(
        memberId,
      )

      setError(
        null,
      )

      setSuccess(
        null,
      )

      const result =
        await removeCampaignMember(
          numericCampaignId,
          memberId,
        )

      setSuccess(
        result.message,
      )

      await loadTeam()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove member.",
      )
    } finally {
      setBusyMemberId(
        null,
      )
    }
  }

  if (
    loading &&
    !team
  ) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-7 animate-spin text-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading team...
          </p>
        </div>
      </div>
    )
  }

  if (
    error &&
    !team
  ) {
    return (
      <div className="p-6 lg:p-8">
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

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      </div>
    )
  }

  if (!team) {
    return null
  }

  return (
    <div className="mx-auto max-w-[1250px] p-4 sm:p-6 lg:p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() =>
          navigate(
            `/campaigns/${numericCampaignId}`,
          )
        }
      >
        <ArrowLeft className="size-4" />
        Back to campaign
      </Button>

      <section className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-blue-600">
            Campaign management
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Team
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {team.campaign.name}
          </p>
        </div>

        <Button
          variant="outline"
          disabled={
            loading
          }
          onClick={() =>
            void loadTeam()
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
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">
            {success}
          </p>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-blue-600" />

                  <h2 className="font-semibold">
                    Team members
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {
                    orderedMembers.length
                  }{" "}
                  member
                  {
                    orderedMembers.length ===
                    1
                      ? ""
                      : "s"
                  }
                </p>
              </div>
            </div>

            {orderedMembers.map(
              (
                member,
                index,
              ) => {
                const displayName =
                  member.user
                    .name?.trim() ||
                  member.user
                    .email

                const isBusy =
                  busyMemberId ===
                  member.id

                return (
                  <div
                    key={
                      member.id
                    }
                    className={`flex flex-col gap-4 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between ${
                      index !==
                      orderedMembers.length -
                        1
                        ? "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">
                          {
                            displayName
                          }
                        </p>

                        {member.isOwner && (
                          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                            OWNER
                          </span>
                        )}

                        {!member.isOwner && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {
                              member.role
                            }
                          </span>
                        )}
                      </div>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        {
                          member.user
                            .email
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        User ID{" "}
                        {
                          member.userId
                        }{" "}
                        · Membership ID{" "}
                        {
                          member.id
                        }
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <select
                          value={
                            member.role
                          }
                          disabled={
                            member.isOwner ||
                            isBusy
                          }
                          onChange={(
                            event,
                          ) =>
                            void handleRoleChange(
                              member.id,
                              event
                                .target
                                .value as CampaignRole,
                            )
                          }
                          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="MAKER">
                            MAKER
                          </option>

                          <option value="CHECKER">
                            CHECKER
                          </option>

                          <option value="ADMIN">
                            ADMIN
                          </option>
                        </select>

                        <Button
                          variant="outline"
                          disabled={
                            member.isOwner ||
                            isBusy
                          }
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() =>
                            void handleRemoveMember(
                              member.id,
                              displayName,
                            )
                          }
                        >
                          {isBusy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}

                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                )
              },
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canManage ? (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50">
                  <UserPlus className="size-5 text-blue-600" />
                </div>

                <h2 className="mt-5 font-semibold">
                  Add team member
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The user must already
                  have an account.
                </p>

                <div className="mt-5">
                  <label
                    htmlFor="member-email"
                    className="text-sm font-medium"
                  >
                    User email
                  </label>

                  <input
                    id="member-email"
                    type="email"
                    value={
                      email
                    }
                    disabled={
                      adding
                    }
                    onChange={(
                      event,
                    ) => {
                      setEmail(
                        event.target
                          .value,
                      )

                      setError(
                        null,
                      )
                    }}
                    placeholder="checker@example.com"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="member-role"
                    className="text-sm font-medium"
                  >
                    Campaign role
                  </label>

                  <select
                    id="member-role"
                    value={
                      newRole
                    }
                    disabled={
                      adding
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewRole(
                        event
                          .target
                          .value as CampaignRole,
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="MAKER">
                      MAKER
                    </option>

                    <option value="CHECKER">
                      CHECKER
                    </option>

                    <option value="ADMIN">
                      ADMIN
                    </option>
                  </select>
                </div>

                <Button
                  className="mt-5 w-full bg-blue-600 hover:bg-blue-700"
                  disabled={
                    adding ||
                    !email.trim()
                  }
                  onClick={() =>
                    void handleAddMember()
                  }
                >
                  {adding ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}

                  Add member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <ShieldCheck className="size-6 text-slate-400" />

                <h2 className="mt-4 font-semibold">
                  View only
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Only the campaign
                  Owner or an Admin can
                  change team
                  membership.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-blue-200 bg-blue-50 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-blue-700" />

                <div>
                  <p className="font-semibold text-blue-900">
                    Role separation
                  </p>

                  <p className="mt-2 text-xs leading-5 text-blue-700">
                    Makers upload asset
                    versions. Checkers
                    perform the human
                    review. Admins can
                    manage campaign
                    members.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}