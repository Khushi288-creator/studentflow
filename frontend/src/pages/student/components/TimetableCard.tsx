import { useMemo, useState } from 'react'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { type TimetableEntry } from '../useStudentDashboardData'

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-2xl px-3 py-2 text-xs font-semibold',
        active
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20'
          : 'border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/8',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function CompactTable({ rows }: { rows: TimetableEntry[] }) {
  const limited = rows.slice(0, 5)
  const extra = Math.max(0, rows.length - limited.length)

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <div className="col-span-4">Subject</div>
        <div className="col-span-3">Class</div>
        <div className="col-span-3">Time</div>
        <div className="col-span-2 text-right">Date</div>
      </div>
      {limited.map((r, idx) => (
        <div
          key={r.id ?? idx}
          className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 px-3 py-2 text-xs transition-colors hover:bg-slate-100 dark:hover:bg-white/8"
        >
          <div className="col-span-4 truncate font-semibold text-slate-900 dark:text-slate-50">{r.subject ?? '—'}</div>
          <div className="col-span-3 truncate text-slate-600 dark:text-slate-300">{r.class ? `Class ${r.class}` : '—'}</div>
          <div className="col-span-3 truncate text-slate-600 dark:text-slate-300">{r.time ?? '—'}</div>
          <div className="col-span-2 truncate text-right text-slate-500 dark:text-slate-400">{r.date ?? '—'}</div>
        </div>
      ))}
      {extra > 0 ? <div className="text-[11px] text-slate-500 dark:text-slate-400">+ {extra} more</div> : null}
    </div>
  )
}

export default function TimetableCard({
  regular,
  exams,
  regularLoading,
  examLoading,
  regularError,
  examError,
}: {
  regular: TimetableEntry[]
  exams: TimetableEntry[]
  regularLoading: boolean
  examLoading: boolean
  regularError: boolean
  examError: boolean
}) {
  const [tab, setTab] = useState<'regular' | 'exam'>('regular')

  const current = useMemo(() => {
    if (tab === 'regular') return { rows: regular, loading: regularLoading, error: regularError }
    return { rows: exams, loading: examLoading, error: examError }
  }, [tab, regular, exams, regularLoading, examLoading, regularError, examError])

  return (
    <Card className="h-full min-h-0 overflow-hidden">
      <CardHeader
        title="Timetable"
        subtitle="Regular & Exam"
        right={
          <div className="flex items-center gap-2">
            <TabButton active={tab === 'regular'} onClick={() => setTab('regular')}>
              Regular
            </TabButton>
            <TabButton active={tab === 'exam'} onClick={() => setTab('exam')}>
              Exam
            </TabButton>
          </div>
        }
      />
      <CardBody className="min-h-0">
        {current.loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Loading timetable...
          </div>
        ) : current.error ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            No timetable available
          </div>
        ) : current.rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            No timetable available
          </div>
        ) : (
          <CompactTable rows={current.rows} />
        )}
      </CardBody>
    </Card>
  )
}

