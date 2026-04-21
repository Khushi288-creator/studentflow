import { Card, CardBody, CardHeader } from '../../../components/ui/Card'
import { Link } from 'react-router-dom'

function formatCurrency(amount: number) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `₹ ${amount}`
  }
}

export default function FeesStatusCard({
  loading,
  hasError,
  totals,
}: {
  loading: boolean
  hasError: boolean
  totals: { total: number; paid: number; pending: number; status?: string } | undefined
}) {
  const hasData = Boolean(totals && (totals.total > 0 || totals.paid > 0 || totals.pending > 0 || totals.status))
  const isPending = (totals?.pending ?? 0) > 0

  return (
    <Card className="h-full min-h-0 overflow-hidden">
      <CardHeader title="💰 Fees Status" subtitle="Your payment overview" />
      <CardBody className="min-h-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading fees...</div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">No fees data available</div>
        ) : (
          <div className="space-y-3">
            {/* Big numbers row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: formatCurrency(totals?.total ?? 0), glow: 'border-indigo-500/20 bg-indigo-500/10', text: 'text-indigo-300' },
                { label: 'Paid', value: formatCurrency(totals?.paid ?? 0), glow: 'border-emerald-500/20 bg-emerald-500/10', text: 'text-emerald-300' },
                { label: 'Pending', value: formatCurrency(totals?.pending ?? 0), glow: isPending ? 'border-amber-500/20 bg-amber-500/10' : 'border-slate-200 dark:border-white/8 bg-white/5', text: isPending ? 'text-amber-300' : 'text-slate-400' },
              ].map(x => (
                <div key={x.label} className={`rounded-xl border ${x.glow} px-2 py-2.5 text-center`}>
                  <div className="text-[10px] text-slate-500 mb-1">{x.label}</div>
                  <div className={`text-xs font-bold ${x.text} leading-tight`}>{x.value}</div>
                </div>
              ))}
            </div>

            {/* Status badge */}
            <div className={`rounded-xl border px-3 py-2 flex items-center justify-between ${
              totals?.status === 'Paid' ? 'border-emerald-500/30 bg-emerald-500/10'
              : totals?.status === 'Unpaid' ? 'border-rose-500/30 bg-rose-500/10'
              : totals?.status === 'Partial' ? 'border-amber-500/30 bg-amber-500/10'
              : 'border-slate-200 dark:border-white/8 bg-white/5'
            }`}>
              <span className="text-xs text-slate-500 dark:text-slate-400">Status</span>
              <span className={`text-xs font-bold ${
                totals?.status === 'Paid' ? 'text-emerald-300'
                : totals?.status === 'Unpaid' ? 'text-rose-300'
                : totals?.status === 'Partial' ? 'text-amber-300'
                : 'text-slate-300'
              }`}>
                {totals?.status === 'Paid' ? '✓ Fully Paid'
                 : totals?.status === 'Unpaid' ? '⚠ Unpaid'
                 : totals?.status === 'Partial' ? '⚡ Partial'
                 : totals?.status ?? '—'}
              </span>
            </div>

            {isPending && (
              <Link to="/fees"
                className="block w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2 text-center text-xs font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20">
                Pay Now →
              </Link>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

