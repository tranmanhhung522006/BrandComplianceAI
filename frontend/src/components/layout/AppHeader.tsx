import {
  Bell,
  Menu,
  Search,
  Upload,
} from "lucide-react"

import {
  useLocation,
  useNavigate,
} from "react-router-dom"

import {
  Button,
} from "@/components/ui/button"

import {
  Input,
} from "@/components/ui/input"

import {
  useAuth,
} from "@/context/AuthContext"

interface AppHeaderProps {
  onMenuClick: () => void
}

function getPageTitle(
  pathname: string,
) {
  if (
    pathname ===
    "/admin/audit"
  ) {
    return "Audit log"
  }

  if (
    pathname ===
    "/admin/compliance"
  ) {
    return "Compliance documents"
  }

  if (
    pathname ===
    "/admin/releases"
  ) {
    return "Release queue"
  }

  if (
    pathname.startsWith(
      "/reviews/",
    )
  ) {
    return "Checker review"
  }

  if (
    pathname ===
    "/reviews"
  ) {
    return "Review queue"
  }

  if (
    pathname ===
    "/campaigns/new"
  ) {
    return "Create campaign"
  }

  if (
    pathname.startsWith(
      "/campaigns/",
    )
  ) {
    return "Campaign details"
  }

  if (
    pathname ===
    "/campaigns"
  ) {
    return "Campaigns"
  }

  if (
    pathname ===
    "/assets/new"
  ) {
    return "Create asset"
  }

  if (
    pathname ===
    "/upload"
  ) {
    return "Upload artwork"
  }

  if (
    pathname.startsWith(
      "/assets/",
    )
  ) {
    return "Asset details"
  }

  if (
    pathname ===
    "/assets"
  ) {
    return "Assets"
  }

  return "Overview"
}

export function AppHeader({
  onMenuClick,
}: AppHeaderProps) {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const {
    user,
    roles,
    hasRole,
  } =
    useAuth()

  const pageTitle =
    getPageTitle(
      location.pathname,
    )

  const roleText =
    roles.length > 0
      ? roles.join(" · ")
      : "MEMBER"

  const canUpload =
    hasRole("MAKER") ||
    Boolean(
      user?.campaignsOwned.length,
    )

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:h-20 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-xl lg:hidden"
          aria-label="Open navigation menu"
          onClick={
            onMenuClick
          }
        >
          <Menu className="size-5" />
        </Button>

        <div className="min-w-0">
          <p className="hidden truncate text-sm text-slate-500 sm:block">
            Brand Compliance AI
            {user
              ? ` · ${roleText}`
              : ""}
          </p>

          <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="relative hidden xl:block">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

          <Input
            placeholder="Search..."
            className="w-[260px] rounded-xl border-slate-200 bg-slate-50 pl-9 shadow-none"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative rounded-xl"
          aria-label="Notifications"
        >
          <Bell className="size-4" />

          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-red-500" />
        </Button>

        {canUpload && (
          <Button
            className="hidden rounded-xl bg-blue-600 shadow-sm hover:bg-blue-700 sm:flex"
            onClick={() =>
              navigate(
                "/upload",
              )
            }
          >
            <Upload className="size-4" />

            <span className="hidden md:inline">
              Upload asset
            </span>
          </Button>
        )}
      </div>
    </header>
  )
}