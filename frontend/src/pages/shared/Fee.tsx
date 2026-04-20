import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Navigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useModalClose } from '../../hooks/useModalClose'

type FeeRow = {
  id: string; amount: number; paidAmount: number; pendingAmount: number
  status: string; className?: string; feeType?: string; description?: string
  dueDate?: string; studentName?: string; studentUserId?: string
}
type StudentUser = { id: string; name: string; profile?: { className?: string } }
type FeeStructure = { id: string; className: string; feeType: string; amount: number; dueDate?: string }

// ── Helpers ────────────────────────────────────────────────────────────────
function G({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 backdrop-blur-sm p-5 ${className}`}>{children}</div>
}

function StatusBadge({ status, paidAmount, amount }: { status: string; paidAmount?: number; amount?: number }) {
  const isPartial = paidAmount !== undefined && amount !== undefined && paidAmount > 0 && paidAmount < amount
  if (isPartial) return <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-300 ring-1 ring-orange-500/30">⚡ Partial</span>
  if (status === 'paid') return <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">✓ Paid</span>
  if (status === 'overdue') return <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30">⚠ Overdue</span>
  return <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">⏳ Pending</span>
}

const FEE_TYPES = ['tuition', 'exam', 'transport']
const CLASSES = ['4', '5', '6', '7', '8']

// ── Admin View ─────────────────────────────────────────────────────────────
function AdminFees() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'structure' | 'individual' | 'records'>('structure')
  const [classFilter, setClassFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editFee, setEditFee] = useState<FeeRow | null>(null)
  const [editPaid, setEditPaid] = useState('')

  // Structure form
  const [sClass, setSClass] = useState('')
  const [sType, setSType] = useState('tuition')
  const [sAmount, setSAmount] = useState('')
  const [sDue, setSDue] = useState('')
  const [sMsg, setSMsg] = useState('')

  // Individual form
  const [iStudentId, setIStudentId] = useState('')
  const [iAmount, setIAmount] = useState('')
  const [iClass, setIClass] = useState('')
  const [iType, setIType] = useState('tuition')
  const [iDue, setIDue] = useState('')
  const [iMsg, setIMsg] = useState('')

  const feesQuery = useQuery({
    queryKey: ['adminFees', classFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (classFilter !== 'all') params.className = classFilter
      if (statusFilter !== 'all') params.status = statusFilter
      return (await http.get('/admin/fees', { params })).data as { fees: FeeRow[] }
    },
  })

  const structuresQuery = useQuery({
    queryKey: ['feeStructures'],
    queryFn: async () => (await http.get('/admin/fees/structures')).data as { structures: FeeStructure[] },
  })

  const studentsQuery = useQuery({
    queryKey: ['adminStudents'],
    queryFn: async () => (await http.get('/admin/students')).data as { students: StudentUser[] },
  })

  const structureMutation = useMutation({
    mutationFn: async () => (await http.post('/admin/fees/structure', {
      className: sClass, feeType: sType, amount: Number(sAmount), dueDate: sDue || undefined,
    })).data as { assigned: number },
    onSuccess: (d) => {
      queryClient.invalidateQueries({ queryKey: ['adminFees'] })
      queryClient.invalidateQueries({ queryKey: ['feeStructures'] })
      setSClass(''); setSAmount(''); setSDue('')
      setSMsg(`✓ Assigned to ${d.assigned} student${d.assigned !== 1 ? 's' : ''}`)
      setTimeout(() => setSMsg(''), 4000)
    },
  })

  const individualMutation = useMutation({
    mutationFn: async () => (await http.post('/admin/fees', {
      studentUserId: iStudentId, amount: Number(iAmount),
      className: iClass || undefined, feeType: iType, dueDate: iDue || undefined,
    })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFees'] })
      setIStudentId(''); setIAmount(''); setIClass(''); setIDue('')
      setIMsg('✓ Fee created')
      setTimeout(() => setIMsg(''), 3000)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, paidAmount }: { id: string; paidAmount: number }) =>
      (await http.put(`/admin/fees/${id}`, { paidAmount })).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminFees'] }); setEditFee(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/admin/fees/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminFees'] }),
  })

  const fees = feesQuery.data?.fees ?? []
  const students = studentsQuery.data?.students ?? []
  const totalCollected = fees.filter(f => f.status === 'paid').reduce((a, f) => a + f.amount, 0)
  const totalPending = fees.filter(f => f.status !== 'paid').reduce((a, f) => a + f.pendingAmount, 0)
  const pendingCount = fees.filter(f => f.status !== 'paid').length

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/3 backdrop-blur-sm px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">💰</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Fees Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">Create fee structures, assign to classes, track payments</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Collected', value: `₹${totalCollected.toLocaleString('en-IN')}`, color: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-600/20 dark:to-teal-600/20 dark:border-emerald-500/20', text: 'text-emerald-300' },
            { label: 'Total Pending', value: `₹${totalPending.toLocaleString('en-IN')}`, color: 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-600/20 dark:to-orange-600/20 dark:border-amber-500/20', text: 'text-amber-300' },
            { label: 'Students Pending', value: pendingCount, color: 'from-rose-50 to-pink-50 border-rose-200 dark:from-rose-600/20 dark:to-pink-600/20 dark:border-rose-500/20', text: 'text-rose-300' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border bg-gradient-to-br ${s.color} p-4 transition-all hover:scale-[1.02]`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-1 w-fit">
          {([
            { key: 'structure', label: '🏗 Fee Structure' },
            { key: 'individual', label: '👤 Individual' },
            { key: 'records', label: '📋 All Records' },
          ] as const).map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Fee Structure Tab ── */}
        {tab === 'structure' && (
          <div className="space-y-4">
            <G>
              <div className="text-sm font-semibold text-slate-200 mb-1">Create Fee Structure</div>
              <div className="text-xs text-slate-500 mb-4">Auto-assigns to all students of the selected class</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class *</span>
                  <select value={sClass} onChange={e => setSClass(e.target.value)}
                    className="h-10 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-100 outline-none focus:border-indigo-500">
                    <option value="">Select class...</option>
                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fee Type *</span>
                  <select value={sType} onChange={e => setSType(e.target.value)}
                    className="h-10 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-100 outline-none focus:border-indigo-500">
                    {FEE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount (₹) *</span>
                  <input type="number" value={sAmount} onChange={e => setSAmount(e.target.value)} placeholder="e.g. 5000"
                    className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500" />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Due Date</span>
                  <input type="date" value={sDue} onChange={e => setSDue(e.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500" />
                </label>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" disabled={!sClass || !sAmount || structureMutation.isPending}
                  onClick={() => structureMutation.mutate()}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
                  {structureMutation.isPending ? 'Assigning...' : '🏗 Create & Auto-Assign'}
                </button>
                {sMsg && <span className="text-xs text-emerald-400">{sMsg}</span>}
                {structureMutation.isError && <span className="text-xs text-rose-400">{(structureMutation.error as any)?.response?.data?.message ?? 'Failed'}</span>}
              </div>
            </G>

            {/* Existing structures */}
            <G>
              <div className="text-sm font-semibold text-slate-200 mb-3">Fee Structures</div>
              {structuresQuery.data?.structures.length === 0 ? (
                <p className="text-sm text-slate-500">No structures created yet.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(structuresQuery.data?.structures ?? []).map(s => (
                    <div key={s.id} className="rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">Class {s.className}</span>
                        <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300">{s.feeType}</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">₹{s.amount.toLocaleString('en-IN')}</div>
                      {s.dueDate && <div className="text-xs text-slate-500 mt-0.5">Due: {s.dueDate}</div>}
                    </div>
                  ))}
                </div>
              )}
            </G>
          </div>
        )}

        {/* ── Individual Tab ── */}
        {tab === 'individual' && (
          <G>
            <div className="text-sm font-semibold text-slate-200 mb-1">Assign Fee to Individual Student</div>
            <div className="text-xs text-slate-500 mb-4">Manually assign a fee to a specific student</div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Student *</span>
                <select value={iStudentId} onChange={e => {
                  setIStudentId(e.target.value)
                  const s = students.find(s => s.id === e.target.value)
                  if (s?.profile?.className) setIClass(s.profile.className)
                }}
                  className="h-10 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-100 outline-none focus:border-indigo-500">
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}{s.profile?.className ? ` (Class ${s.profile.className})` : ''}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Fee Type</span>
                <select value={iType} onChange={e => setIType(e.target.value)}
                  className="h-10 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-sm text-slate-100 outline-none focus:border-indigo-500">
                  {FEE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount (₹) *</span>
                <input type="number" value={iAmount} onChange={e => setIAmount(e.target.value)} placeholder="e.g. 5000"
                  className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Class</span>
                <input value={iClass} onChange={e => setIClass(e.target.value)} placeholder="e.g. 8"
                  className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-500" />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Due Date</span>
                <input type="date" value={iDue} onChange={e => setIDue(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500" />
              </label>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button type="button" disabled={!iStudentId || !iAmount || individualMutation.isPending}
                onClick={() => individualMutation.mutate()}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all shadow-lg shadow-indigo-500/20">
                {individualMutation.isPending ? 'Creating...' : '👤 Assign Fee'}
              </button>
              {iMsg && <span className="text-xs text-emerald-400">{iMsg}</span>}
              {individualMutation.isError && <span className="text-xs text-rose-400">{(individualMutation.error as any)?.response?.data?.message ?? 'Failed'}</span>}
            </div>
          </G>
        )}

        {/* ── Records Tab ── */}
        {tab === 'records' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-xs text-slate-200 outline-none focus:border-indigo-500">
                <option value="all">All Classes</option>
                {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-white/10 bg-white dark:bg-[#0f172a] px-3 text-xs text-slate-200 outline-none focus:border-indigo-500">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <span className="ml-auto text-xs text-slate-500">{fees.length} records</span>
            </div>

            <G className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8">
                      {['Class', 'Student', 'Type', 'Total', 'Paid', 'Pending', 'Due', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {feesQuery.isLoading && <tr><td colSpan={9} className="px-4 py-4 text-sm text-slate-500">Loading...</td></tr>}
                    {fees.map(f => (
                      <tr key={f.id} className="border-b border-white/5 hover:bg-slate-50 dark:hover:bg-slate-50 dark:hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                        <td className="px-4 py-3">
                          {f.className ? <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300">{f.className}</span> : '—'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{f.studentName}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 capitalize">{f.feeType}</td>
                        <td className="px-4 py-3 font-semibold text-slate-100">₹{f.amount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-emerald-400">₹{f.paidAmount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-amber-400">₹{f.pendingAmount.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{f.dueDate || '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={f.status} paidAmount={f.paidAmount} amount={f.amount} /></td>
                        <td className="px-4 py-3 flex gap-1.5">
                          <button type="button" onClick={() => { setEditFee(f); setEditPaid(String(f.paidAmount)) }}
                            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
                            Edit
                          </button>
                          <button type="button" disabled={deleteMutation.isPending}
                            onClick={() => { if (confirm(`Delete fee for ${f.studentName}?`)) deleteMutation.mutate(f.id) }}
                            className="rounded-lg border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 disabled:opacity-40">
                            Del
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!feesQuery.isLoading && fees.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">No records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </G>
          </div>
        )}

      </div>

      {/* Edit modal */}
      {editFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/40 dark:bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setEditFee(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white dark:bg-[#0f172a] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Update Payment — {editFee.studentName}</h2>
              <button onClick={() => setEditFee(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 px-4 py-3 text-sm">
                <div className="flex justify-between text-slate-400 text-xs mb-1"><span>Total</span><span>₹{editFee.amount}</span></div>
                <div className="flex justify-between text-slate-400 text-xs"><span>Currently Paid</span><span className="text-emerald-400">₹{editFee.paidAmount}</span></div>
              </div>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Paid Amount (₹)</span>
                <input type="number" value={editPaid} onChange={e => setEditPaid(e.target.value)} min={0} max={editFee.amount}
                  className="h-10 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editFee.id, paidAmount: Number(editPaid) })}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 transition-all">
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setEditFee(null)}
                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Student View ───────────────────────────────────────────────────────────
function StudentFees() {
  const queryClient = useQueryClient()
  const [qrFeeId, setQrFeeId] = useState<string | null>(null)
  const [txnId, setTxnId] = useState('')
  const [paidSuccess, setPaidSuccess] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fees'],
    queryFn: async () => (await http.get('/fees')).data as { fees: FeeRow[] },
  })
  const fees = data?.fees ?? []

  const payMutation = useMutation({
    mutationFn: async (feeId: string) => (await http.post('/fees/pay', { feeId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      queryClient.invalidateQueries({ queryKey: ['studentSummary'] })
      setPaidSuccess(qrFeeId)
      setQrFeeId(null)
      setTxnId('')
      setTimeout(() => setPaidSuccess(null), 5000)
    },
  })

  const total = fees.reduce((a, f) => a + f.amount, 0)
  const paid = fees.reduce((a, f) => a + f.paidAmount, 0)
  const pending = fees.reduce((a, f) => a + f.pendingAmount, 0)
  const hasPending = pending > 0

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-200 dark:border-white/8 bg-white/3 backdrop-blur-sm px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg shadow-lg shadow-indigo-500/25">💳</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Fees</h1>
            <p className="text-xs text-slate-400 mt-0.5">Track and pay your school fees</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Pending alert */}
        {hasPending && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="text-sm font-semibold text-amber-300">Fees Due</div>
              <div className="text-xs text-amber-400/80">You have ₹{pending.toLocaleString('en-IN')} in pending fees. Please pay before the due date.</div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Fees', value: `₹${total.toLocaleString('en-IN')}`, color: 'from-indigo-50 to-purple-50 border-indigo-200 dark:from-indigo-600/20 dark:to-purple-600/20 dark:border-indigo-500/20', text: 'text-indigo-300' },
            { label: 'Paid', value: `₹${paid.toLocaleString('en-IN')}`, color: 'from-emerald-50 to-teal-50 border-emerald-200 dark:from-emerald-600/20 dark:to-teal-600/20 dark:border-emerald-500/20', text: 'text-emerald-300' },
            { label: 'Pending', value: `₹${pending.toLocaleString('en-IN')}`, color: pending > 0 ? 'from-amber-50 to-orange-50 border-amber-200 dark:from-amber-600/20 dark:to-orange-600/20 dark:border-amber-500/20' : 'from-slate-600/20 to-slate-700/20 border-slate-500/20', text: pending > 0 ? 'text-amber-300' : 'text-slate-300' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border bg-gradient-to-br ${s.color} p-4 transition-all hover:scale-[1.02]`}>
              <div className={`text-2xl font-bold ${s.text}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Fee list */}
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-slate-500">Loading...</p>}
          {!isLoading && fees.length === 0 && (
            <G className="text-center py-8"><p className="text-sm text-slate-500">No fee records found.</p></G>
          )}
          {fees.map(f => {
            const isPending = f.status !== 'paid'
            const isQrOpen = qrFeeId === f.id
            return (
              <div key={f.id} className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 p-4 transition-all hover:bg-slate-100 dark:hover:bg-white/8">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {f.className && <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">Class {f.className}</span>}
                      {f.feeType && <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300 capitalize">{f.feeType}</span>}
                      <StatusBadge status={f.status} paidAmount={f.paidAmount} amount={f.amount} />
                      {f.dueDate && <span className="text-xs text-slate-500">Due: {f.dueDate}</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white/5 py-2">
                        <div className="text-sm font-bold text-slate-100">₹{f.amount.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-slate-500">Total</div>
                      </div>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2">
                        <div className="text-sm font-bold text-emerald-300">₹{f.paidAmount.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-slate-500">Paid</div>
                      </div>
                      <div className={`rounded-xl border py-2 ${f.pendingAmount > 0 ? 'border-amber-500/20 bg-amber-500/10' : 'border-slate-200 dark:border-white/8 bg-white/5'}`}>
                        <div className={`text-sm font-bold ${f.pendingAmount > 0 ? 'text-amber-300' : 'text-slate-400'}`}>₹{f.pendingAmount.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-slate-500">Pending</div>
                      </div>
                    </div>
                  </div>
                  {isPending && (
                    <button type="button"
                      onClick={() => setQrFeeId(isQrOpen ? null : f.id)}
                      className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-500/20">
                      💳 Pay
                    </button>
                  )}
                </div>

                {/* QR Panel */}
                {isQrOpen && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 p-5 flex flex-col items-center gap-4">
                    {/* QR code centered */}
                    <div className="rounded-2xl bg-white p-4 shadow-lg">
                      <QRCodeSVG value={`PAY:${f.id}:₹${f.pendingAmount}:CLASS:${f.className ?? ''}`} size={180} />
                    </div>

                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Scan with any UPI app</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Amount: <span className="text-white font-bold">₹{f.pendingAmount.toLocaleString('en-IN')}</span>
                      </p>
                    </div>

                    {/* Optional transaction ID */}
                    <div className="w-full max-w-xs">
                      <label className="grid gap-1.5">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Transaction ID <span className="text-slate-600">(optional)</span></span>
                        <input
                          value={txnId}
                          onChange={e => setTxnId(e.target.value)}
                          placeholder="e.g. UPI123456789"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors"
                        />
                      </label>
                    </div>

                    {/* I Have Paid button — only this triggers payment */}
                    <button
                      type="button"
                      disabled={payMutation.isPending}
                      onClick={() => payMutation.mutate(f.id)}
                      className="w-full max-w-xs rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 transition-all shadow-lg shadow-emerald-500/20">
                      {payMutation.isPending ? '⏳ Processing...' : '✅ I Have Paid'}
                    </button>

                    <button type="button" onClick={() => { setQrFeeId(null); setTxnId('') }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}

                {/* Success message */}
                {paidSuccess === f.id && (
                  <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 text-center">
                    ✅ Payment confirmed! Your fee has been marked as paid.
                  </div>
                )}
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

// ── Entry ──────────────────────────────────────────────────────────────────
export default function Fee() {
  const { user } = useAuthStore()
  if (user?.role === 'teacher') return <Navigate to="/dashboard" replace />
  if (user?.role === 'admin') return <AdminFees />
  return <StudentFees />
}
