import type { ElementType } from "react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

interface MetricCardProps {
  title: string
  value: string
  description: string
  icon: ElementType
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: MetricCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {title}
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {value}
            </p>
          </div>

          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50">
            <Icon className="size-5 text-blue-600" />
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}