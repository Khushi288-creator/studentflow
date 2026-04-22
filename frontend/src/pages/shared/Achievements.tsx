import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type AchievementRow = {
  id: string
  title: string
  type: 'achievement' | 'activity'
  rank: string | null
  date: string | null
  description: string | null
  studentId: string
  studentName: string
  className: string | null
}

type StudentUser = { id: string; name: string; profile?: { className?: string } }

const RANKS = ['1st', '2nd', '3rd']

const rankColors: Record<string, string> = {
  '1st': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40',
  '2nd': 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700',
  '3rd': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-900/40',
}

function RankBadge({ rank }: { rank: string | null }) {
  if (!rank) return null
  return (
    <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${rankColors[rank] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {rank}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return type === 'achievement'
    ? <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300">🏆 Achievement</span>
    : <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">📘 Activity</span>
}

// ── Card component ─────────────────────────────────────────────────────────
function AchievCard({
  row,
  showStudent,
  onEdit,
  onDelete,
}: {
  row: AchievementRow
  showStudent: boolean
  onEdit?: (r: AchievementRow) => void
  onDelete?: (id: string) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <TypeBadge type={row.type} />
            <RankBadge rank={row.rank} />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50 mt-1">{row.title}</div>
          {row.description && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{row.description}</div>
          )}
          {showStudent && (
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {row.studentName}{row.className ? ` · Class ${row.className}` : ''}
            </div>
          )}
          {row.date && (
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">{row.date}</div>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1.5 shrink-0">
            {onEdit && (
              <button type="button" onClick={() => onEdit(row)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Edit
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={() => onDelete(row.id)}
                className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/20">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section ────────────────────────────────────────────────────────────────
function Section({
  title, icon, items, showStudent, onEdit, onDelete,
}: {
  title: string; icon: string; items: AchievementRow[]
  showStudent: boolean
  onEdit?: (r: AchievementRow) => void
  onDelete?: (id: string) => void
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
        <span className="rounded-xl bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/40 p-6 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-950/20">
          No {title.toLowerCase()} yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(r => (
            <AchievCard key={r.id} row={r} showStudent={showStudent} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Add / Edit Modal ───────────────────────────────────────────────────────
function SearchableStudentPicker({ value, onChange, students }: {
  value: string; onChange: (id: string) => void; students: StudentUser[]
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = students.find(s => s.id === value)
  const filtered = query.trim()
    ? students.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : students

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : (selected ? `${selected.name}${selected.profile?.className ? ` (Class ${selected.profile.className})` : ''}` : '')}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type to search student..."
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 placeholder:text-slate-400"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl max-h-48 overflow-y-auto dark:border-slate-800 dark:bg-slate-900">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">No students found</div>
          ) : (
            filtered.map(s => (
              <button key={s.id} type="button"
                onMouseDown={() => { onChange(s.id); setQuery(''); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-indigo-950/30 transition-colors">
                {s.name}
                {s.profile?.className && <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">Class {s.profile.className}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function Modal({
  mode, initial, students, onClose, onSave, saving, error,
}: {
  mode: 'create' | 'edit'
  initial: Partial<AchievementRow>
  students: StudentUser[]
  onClose: () => void
  onSave: (data: any) => void
  saving: boolean
  error: string
}) {
  const [studentId, setStudentId] = useState(initial.studentId ?? '')
  const [title, setTitle] = useState(initial.title ?? '')
  const [type, setType] = useState<'achievement' | 'activity'>(initial.type ?? 'achievement')
  const [rank, setRank] = useState(initial.rank ?? '')
  const [date, setDate] = useState(initial.date ?? '')
  const [description, setDescription] = useState(initial.description ?? '')

  useModalClose(true, onClose)

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/40 dark:bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-white dark:bg-[#0f172a] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {mode === 'create' ? 'Add Achievement / Activity' : 'Edit'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none">✕</button>
        </div>

        {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30">{error}</div>}

        <div className="grid gap-3">
          {mode === 'create' && (
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Student *</span>
              <SearchableStudentPicker value={studentId} onChange={setStudentId} students={students} />
            </label>
          )}

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Title *</span>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Drawing Competition Winner"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Type *</span>
            <select value={type} onChange={e => setType(e.target.value as any)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
              <option value="achievement">🏆 Achievement</option>
              <option value="activity">📘 Activity</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Rank (optional)</span>
            <select value={rank} onChange={e => setRank(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
              <option value="">No rank</option>
              {RANKS.map(r => <option key={r} value={r}>{r} Place</option>)}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Date (optional)</span>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Description (optional)</span>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="e.g. Won first place in inter-school science exhibition"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 resize-none" />
          </label>
        </div>

        <button type="button" disabled={saving || !title || (mode === 'create' && !studentId)}
          onClick={() => onSave({ studentId, title, type, rank: rank || null, date: date || null, description: description || null })}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? 'Saving...' : mode === 'create' ? '✓ Add Achievement' : 'Save Changes'}
        </button>
      </div>
    </div>
  , document.body)
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Achievements() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher'

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editRow, setEditRow] = useState<AchievementRow | null>(null)
  const [modalError, setModalError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => (await http.get('/achievements')).data as { achievements: AchievementRow[] },
  })

  const studentsQuery = useQuery({
    queryKey: ['adminStudents'],
    queryFn: async () => (await http.get('/admin/students')).data as { students: StudentUser[] },
    enabled: isAdmin,
  })

  const createMutation = useMutation({
    mutationFn: async (body: any) => (await http.post('/achievements', body)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] })
      setModalMode('none'); setModalError('')
      showToast('success', data?.message ?? 'Achievement saved successfully!')
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? 'Failed to save achievement'
      setModalError(msg)
      showToast('error', msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: any) => (await http.put(`/achievements/${id}`, body)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] })
      setModalMode('none'); setModalError('')
      showToast('success', data?.message ?? 'Achievement updated successfully!')
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? 'Failed to update achievement'
      setModalError(msg)
      showToast('error', msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/achievements/${id}`)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] })
      showToast('success', data?.message ?? 'Achievement deleted.')
    },
    onError: (e: any) => showToast('error', e?.response?.data?.message ?? 'Failed to delete'),
  })

  const rows = data?.achievements ?? []
  const achievements = rows.filter(r => r.type === 'achievement')
  const activities = rows.filter(r => r.type === 'activity')
  const showStudent = isAdmin || isTeacher
  const students = studentsQuery.data?.students ?? []

  const handleDelete = (id: string) => {
    if (confirm('Delete this record?')) deleteMutation.mutate(id)
  }

  const handleEdit = (r: AchievementRow) => {
    setEditRow(r); setModalError(''); setModalMode('edit')
  }

  return (
    <Page
      title="Achievements & Activities"
      subtitle={isAdmin ? 'Manage student achievements and activities.' : isTeacher ? 'View all student achievements and activities.' : 'Your achievements and activities.'}
      actions={
        isAdmin ? (
          <button type="button" onClick={() => { setEditRow(null); setModalError(''); setModalMode('create') }}
            className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            + Add
          </button>
        ) : null
      }
    >
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 rounded-2xl border px-5 py-3 shadow-2xl animate-in slide-in-from-right-5 ${
          toast.type === 'success'
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{toast.type === 'success' ? '✓' : '✕'}</span>
            <span className="text-sm font-semibold">{toast.msg}</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-8">
          <Section
            title="Achievements" icon="🏆"
            items={achievements}
            showStudent={showStudent}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
          />
          <Section
            title="Activities" icon="📘"
            items={activities}
            showStudent={showStudent}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? handleDelete : undefined}
          />
        </div>
      )}

      {modalMode !== 'none' && (
        <Modal
          mode={modalMode as 'create' | 'edit'}
          initial={editRow ?? {}}
          students={students}
          onClose={() => setModalMode('none')}
          saving={createMutation.isPending || updateMutation.isPending}
          error={modalError}
          onSave={(data) => {
            if (modalMode === 'create') createMutation.mutate(data)
            else updateMutation.mutate({ id: editRow!.id, ...data })
          }}
        />
      )}
    </Page>
  )
}
