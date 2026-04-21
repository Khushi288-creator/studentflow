import React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type FeeRow = { id: string; amount: number; status: string }

export default function AdminFees() {
  const feesQuery = useQuery({
    queryKey: ['adminFees'],
    queryFn: async () => (await http.get('/fees')).data as { fees: FeeRow[] },
  })

  const updateMutation = useMutation({
    mutationFn: async (p: { feeId: string; status: 'paid' | 'pending' | 'overdue' }) =>
      (await http.post(`/admin/fees/${p.feeId}/status`, { status: p.status })).data,
    onSuccess: () => feesQuery.refetch(),
  })

  const fees = feesQuery.data?.fees ?? []
  const total = fees.reduce((a, f) => a + f.amount, 0)
  const paid = fees.filter(f => f.status === 'paid').reduce((a, f) => a + f.amount, 0)
  const pending = fees.filter(f => f.status === 'pending').reduce((a, f) => a + f.amount, 0)

  return (
    <Page title="Fees" subtitle="Manage student fee records">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-emerald-500 p-4 text-slate-900 dark:text-white">
          <div className="text-2xl font-bold">₹{paid}</div>
          <div className="text-sm opacity-90">Paid</div>
        </div>
        <div className="rounded-2xl bg-amber-400 p-4 text-slate-900 dark:text-white">
          <div className="text-2xl font-bold">₹{pending}</div>
          <div className="text-sm opacity-90">Pending</div>
        </div>
        <div className="rounded-2xl bg-indigo-500 p-4 text-slate-900 dark:text-white">
          <div className="text-2xl font-bold">₹{total}</div>
          <div className="text-sm opacity-90">Total</div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader title="Fee Records" subtitle={`${fees.length} records`}
          right={<div className="rounded-xl bg-indigo-600/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">Admin</div>} />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Amount</th>
                <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Status</th>
                <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {feesQuery.isLoading && (
                <tr><td colSpan={4} className="py-4 text-sm text-slate-500">Loading...</td></tr>
              )}
              {fees.map((f, i) => (
                <tr key={f.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-3 pr-6 text-slate-500 dark:text-slate-400">{i + 1}</td>
                  <td className="py-3 pr-6 font-medium text-slate-900 dark:text-slate-50">₹{f.amount}</td>
                  <td className="py-3 pr-6">
                    <span className={['rounded-xl px-3 py-1 text-xs font-semibold',
                      f.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : f.status === 'overdue' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'].join(' ')}>
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 flex gap-2">
                    <button type="button"
                      disabled={updateMutation.isPending || f.status === 'paid'}
                      onClick={() => updateMutation.mutate({ feeId: f.id, status: 'paid' })}
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                      Mark Paid
                    </button>
                    <button type="button"
                      disabled={updateMutation.isPending || f.status === 'overdue'}
                      onClick={() => updateMutation.mutate({ feeId: f.id, status: 'overdue' })}
                      className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50">
                      Mark Overdue
                    </button>
                  </td>
                </tr>
              ))}
              {!feesQuery.isLoading && fees.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-sm text-slate-500">No fee records.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </Page>
  )
}
