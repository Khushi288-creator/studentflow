import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'

type SalaryRow = {
  id: string; month: number; monthName: string; year: number
  baseSalary: number; hra: number; bonus: number
  leaveDeduction: number; latePenalty: number; netSalary: number
  status: string; paidAt: string | null
}

function SlipCard({ s }: { s: SalaryRow }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 p-4 transition-all hover:bg-slate-100 dark:hover:bg-white/8 hover:scale-[1.005]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{s.monthName} {s.year}</div>
          {s.paidAt && <div className="text-xs text-slate-500 mt-0.5">Paid on {s.paidAt}</div>}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
          s.status === 'paid'
            ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
            : 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
        }`}>
          {s.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 py-2">
          <div className="text-xs text-slate-500">Base</div>
          <div className="text-sm font-bold text-slate-700 dark:text-slate-200">₹{s.baseSalary.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 py-2">
          <div className="text-xs text-slate-500">Deductions</div>
          <div className="text-sm font-bold text-rose-300">-₹{(s.leaveDeduction + s.latePenalty).toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2">
          <div className="text-xs text-slate-500">Net</div>
          <div className="text-sm font-bold text-indigo-300">₹{s.netSalary.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <button type="button" onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-white/10 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
        {open ? 'Hide Details ▲' : 'View Salary Slip ▼'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Base Salary</span><span className="text-slate-700 dark:text-slate-200">₹{s.baseSalary.toLocaleString('en-IN')}</span></div>
          {s.hra > 0 && <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">HRA</span><span className="text-emerald-400">+₹{s.hra.toLocaleString('en-IN')}</span></div>}
          {s.bonus > 0 && <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Bonus</span><span className="text-emerald-400">+₹{s.bonus.toLocaleString('en-IN')}</span></div>}
          {s.leaveDeduction > 0 && <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Leave Deduction</span><span className="text-rose-400">-₹{s.leaveDeduction.toLocaleString('en-IN')}</span></div>}
          {s.latePenalty > 0 && <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Late Penalty</span><span className="text-rose-400">-₹{s.latePenalty.toLocaleString('en-IN')}</span></div>}
          <div className="border-t border-white/10 pt-2 flex justify-between font-bold">
            <span className="text-slate-700 dark:text-slate-200">Net Salary</span>
            <span className="text-indigo-600 dark:text-indigo-300">₹{s.netSalary.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeacherSalary() {
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['mySalary'],
    queryFn: async () => (await http.get('/salary/me')).data as { salaries: SalaryRow[] },
  })
  const salaries = data?.salaries ?? []

  const totalNet = salaries.reduce((a, s) => a + s.netSalary, 0)
  const totalPaid = salaries.filter(s => s.status === 'paid').reduce((a, s) => a + s.netSalary, 0)
  const totalPending = salaries.filter(s => s.status === 'pending').reduce((a, s) => a + s.netSalary, 0)

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/3 backdrop-blur-sm px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">💼</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Salary</h1>
            <p className="text-xs text-slate-400 mt-0.5">{user?.name} · Salary records and slips</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Earned', value: `₹${totalNet.toLocaleString('en-IN')}`, color: 'from-indigo-50 to-purple-50 border-indigo-200 dark:from-indigo-600/20 dark:to-purple-600/20 dark:border-indigo-500/20', text: 'text-indigo-300' },
            { label: 'Received', value: `₹${totalPaid.toLocaleString('en-IN')}`, color: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-600/20 dark:to-teal-600/20 dark:border-emerald-500/20', text: 'text-emerald-300' },
            { label: 'Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, color: totalPending > 0 ? 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-600/20 dark:to-orange-600/20 dark:border-amber-500/20' : 'from-slate-600/20 to-slate-700/20 border-slate-500/20', text: totalPending > 0 ? 'text-amber-300' : 'text-slate-400' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border bg-gradient-to-br ${s.color} p-4 transition-all hover:scale-[1.02]`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Salary list */}
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : salaries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white/5 p-8 text-center">
            <div className="text-3xl mb-2">💼</div>
            <p className="text-sm text-slate-500">No salary records yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {salaries.map(s => <SlipCard key={s.id} s={s} />)}
          </div>
        )}

      </div>
    </div>
  )
}
