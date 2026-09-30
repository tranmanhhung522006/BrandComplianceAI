import {
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Rocket,
  ShieldCheck,
  X,
} from "lucide-react"

import {
  NavLink,
  useNavigate,
} from "react-router-dom"

import {
  useAuth,
} from "@/context/AuthContext"

interface AppSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function AppSidebar({
  mobileOpen,
  onMobileClose,
}: AppSidebarProps) {
  const navigate =
    useNavigate()

  const {
    user,
    roles,
    hasRole,
    logout,
  } =
    useAuth()

  if (!user) {
    return null
  }

  const isOwner =
    user.campaignsOwned.length >
    0

  const canReview =
    hasRole(
      "CHECKER",
    )

  const canRelease =
    hasRole(
      "ADMIN",
    )

  const canManageCompliance =
    hasRole(
      "ADMIN",
    ) ||
    isOwner

  const navigation = [
    {
      name:
        "Overview",
      icon:
        LayoutDashboard,
      path:
        "/",
    },

    {
      name:
        "Campaigns",
      icon:
        FolderKanban,
      path:
        "/campaigns",
    },

    {
      name:
        "Assets",
      icon:
        FileCheck2,
      path:
        "/assets",
    },

    ...(canReview
      ? [
          {
            name:
              "Review Queue",
            icon:
              ClipboardCheck,
            path:
              "/reviews",
          },
        ]
      : []),

    ...(canRelease
      ? [
          {
            name:
              "Release Queue",
            icon:
              Rocket,
            path:
              "/admin/releases",
          },
        ]
      : []),

    ...(canManageCompliance
      ? [
          {
            name:
              "Compliance",
            icon:
              ShieldCheck,
            path:
              "/admin/compliance",
          },
        ]
      : []),

    {
      name:
        "Audit Log",
      icon:
        FileClock,
      path:
        "/admin/audit",
    },
  ]

  const displayName =
    user.name?.trim() ||
    user.email

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map(
        (part) =>
          part[0],
      )
      .join("")
      .slice(0, 2)
      .toUpperCase()

  const workspaceLabel =
    roles.length === 0
      ? isOwner
        ? "OWNER WORKSPACE"
        : "MEMBER WORKSPACE"
      : roles.length === 1
        ? `${roles[0]} WORKSPACE`
        : "MULTI-ROLE WORKSPACE"

  async function handleLogout() {
    onMobileClose()

    await logout()

    navigate(
      "/login",
      {
        replace:
          true,
      },
    )
  }

  const sidebarContent = (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5 sm:px-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
          <ShieldCheck className="size-5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold tracking-tight">
            Brand Compliance
          </p>

          <p className="truncate text-xs text-slate-500">
            AI Review Platform
          </p>
        </div>

        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={
            onMobileClose
          }
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {workspaceLabel}
        </p>

        <nav className="space-y-1">
          {navigation.map(
            (item) => {
              const Icon =
                item.icon

              return (
                <NavLink
                  key={
                    item.name
                  }
                  to={
                    item.path
                  }
                  end={
                    item.path ===
                    "/"
                  }
                  onClick={
                    onMobileClose
                  }
                  className={({
                    isActive,
                  }) =>
                    `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`
                  }
                >
                  <Icon className="size-[18px] shrink-0" />

                  <span className="truncate">
                    {item.name}
                  </span>
                </NavLink>
              )
            },
          )}
        </nav>
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {displayName}
            </p>

            <p className="truncate text-xs text-slate-500">
              {user.email}
            </p>
          </div>

          <ChevronRight className="size-4 shrink-0 text-slate-400" />
        </div>

        <button
          type="button"
          onClick={() =>
            void handleLogout()
          }
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="size-[18px]" />

          Log out
        </button>
      </div>
    </>
  )

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarContent}
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden ${
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={
          !mobileOpen
        }
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          className="absolute inset-0 size-full cursor-default"
          onClick={
            onMobileClose
          }
        />
      </div>

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={
          !mobileOpen
        }
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,300px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ease-out lg:hidden ${
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}