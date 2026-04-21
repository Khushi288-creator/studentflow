import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  late: '#f59e0b',
  empty: 'rgba(148, 163, 184, 0.35)',
} as const

type PieRow = {
  name: string
  value: number
  status: 'present' | 'absent' | 'late' | 'empty'
}

function colorForCell(row: PieRow) {
  return COLORS[row.status]
}

export default function AttendancePieCard({
  loading,
  hasError,
  present,
  absent,
  lateOrHalfDay,
}: {
  loading: boolean
  hasError: boolean
  present: number
  absent: number
  lateOrHalfDay: number
}) {
  const hasRealData = present + absent + lateOrHalfDay > 0 && !hasError

  const pie: PieRow[] = hasRealData
    ? ([
        { name: 'Present', value: present, status: 'present' as const },
        { name: 'Late / Half Day', value: lateOrHalfDay, status: 'late' as const },
        { name: 'Absent', value: absent, status: 'absent' as const },
      ] satisfies PieRow[])
    : [{ name: 'No data', value: 1, status: 'empty' as const }]

  const showEmptyMessage = loading || hasError || !hasRealData

  return (
    <Card className="h-full min-h-0 overflow-hidden">
      <CardHeader title="📊 Attendance" subtitle="Present • Absent • Late" />
      <CardBody className="flex min-h-0 flex-col">
        <div className="relative w-full" style={{ height: 180 }}>
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60 text-xs text-slate-500 backdrop-blur-[1px] dark:bg-slate-950/40 dark:text-slate-400">
              Loading attendance...
            </div>
          ) : null}
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pie}
                dataKey="value"
                nameKey="name"
                outerRadius={58}
                innerRadius={30}
                stroke="none"
                isAnimationActive={!loading}
              >
                {pie.map((entry) => (
                  <Cell key={entry.name} fill={colorForCell(entry)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {showEmptyMessage && !loading ? (
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            No attendance data available
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}
