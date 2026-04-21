import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { type EventRow } from '../useStudentDashboardData'

export default function EventsCard({
  loading,
  hasError,
  events,
}: {
  loading: boolean
  hasError: boolean
  events: EventRow[]
}) {
  const rows = events.slice(0, 4)
  const extra = Math.max(0, events.length - rows.length)

  return (
    <Card className="h-full min-h-0 overflow-hidden">
      <CardHeader title="Holidays / Events" subtitle="Upcoming notices" />
      <CardBody className="min-h-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Loading events...
          </div>
        ) : hasError ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            No upcoming events / holidays
          </div>
        ) : events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            No upcoming events / holidays
          </div>
        ) : (
          <div className="grid min-h-0 gap-2">
            {rows.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 px-3 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/8"
              >
                <div className="truncate text-xs font-semibold text-slate-900 dark:text-slate-50">{e.title}</div>
                <div className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{e.date}</div>
              </div>
            ))}
            {extra > 0 ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">+ {extra} more</div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

