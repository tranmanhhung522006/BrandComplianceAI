import { Badge } from "@/components/ui/badge"
import type { AssetStatus } from "@/types/dashboard"

interface StatusBadgeProps {
  status: AssetStatus
}

export function StatusBadge({
  status,
}: StatusBadgeProps) {
  if (status === "RELEASED") {
    return (
      <Badge className="border-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
        Released
      </Badge>
    )
  }

  if (status === "APPROVED") {
    return (
      <Badge className="border-0 bg-green-50 text-green-700 hover:bg-green-50">
        Approved
      </Badge>
    )
  }

  if (status === "SCORING") {
    return (
      <Badge className="border-0 bg-blue-50 text-blue-700 hover:bg-blue-50">
        Scoring
      </Badge>
    )
  }

  if (status === "REJECTED") {
    return (
      <Badge className="border-0 bg-red-50 text-red-700 hover:bg-red-50">
        Rejected
      </Badge>
    )
  }

  if (status === "DRAFT") {
    return (
      <Badge className="border-0 bg-slate-100 text-slate-600 hover:bg-slate-100">
        Draft
      </Badge>
    )
  }

  return (
    <Badge className="border-0 bg-amber-50 text-amber-700 hover:bg-amber-50">
      In Review
    </Badge>
  )
}