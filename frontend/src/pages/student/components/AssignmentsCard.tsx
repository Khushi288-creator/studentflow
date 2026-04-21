import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { type AssignmentDashboardRow } from '../useStudentDashboardData'

function StatusPill({ status }: { status: AssignmentDashboardRow['status'] }) {
  if (!status) return <span className="text-xs text-slate-500 dark:text-slate-400">—</span>
  const cls =
    status === 'Completed'
      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
      : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
  return <span className={['rounded-full px-2 py-0.5 text-[10px] font-semibold', cls].join(' ')}>{status}</span>
}

export default function AssignmentsCard({
  loading,
  hasError,
  assignments,
}: {
  loading: boolean
  hasError: boolean
  assignments: AssignmentDashboardRow[]
}) {
  const rows = assignments.slice(0, 5)
  const extra = Math.max(0, assignments.length - rows.length)
  const isEmpty = !loading && (hasError || assignments.length === 0)

  return (
    <Card className={isEmpty ? 'min-h-0 overflow-hidden' : 'h-full min-h-0 overflow-hidden'}>
      <CardHeader title="Assignments" subtitle="Teacher uploads" />
      <CardBody className={isEmpty ? 'py-2' : 'min-h-0'}>
        {loading ? (
          <div className="flex items-center justify-center py-2 text-sm text-slate-500 dark:text-slate-400">
            Loading assignments...
          </div>
        ) : hasError ? (
          <div className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">No assignments available</div>
        ) : assignments.length === 0 ? (
          <div className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">No assignments available</div>
        ) : (
          <div className="grid min-h-0 gap-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <div className="col-span-8">Subject</div>
              <div className="col-span-4 text-right">Status</div>
            </div>
            <div className="grid min-h-0 gap-2">
              {rows.map((a) => (
                <div
                  key={a.id}
                  className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 px-3 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/8"
                >
                  <div className="col-span-8 truncate text-xs font-semibold text-slate-900 dark:text-slate-50">
                    {a.subject ?? '—'}
                  </div>
                  <div className="col-span-4 text-right">
                    <StatusPill status={a.status} />
                  </div>
                </div>
              ))}
            </div>
            {extra > 0 ? (
              <div className="text-[11px] text-slate-500 dark:text-slate-400">+ {extra} more</div>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
