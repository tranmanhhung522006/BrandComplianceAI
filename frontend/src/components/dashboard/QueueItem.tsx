import {
  ChevronRight,
  FileText,
} from "lucide-react"

interface QueueItemProps {
  name: string
  time: string
}

export function QueueItem({
  name,
  time,
}: QueueItemProps) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-slate-200 hover:bg-slate-50">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <FileText className="size-4 text-slate-500" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name}
        </p>

        <p className="mt-0.5 text-xs text-slate-400">
          {time}
        </p>
      </div>

      <ChevronRight className="size-4 text-slate-400" />
    </button>
  )
}