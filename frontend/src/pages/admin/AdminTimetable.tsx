import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type TimetableEntry = {
  id: string; type: string; class: string; day: string
  subject: string; time: string; teacherName?: string; date?: string
}

const CLASSES = ['4', '5', '6', '7', '8']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Gujarati', 'Social Science', 'Computer', 'Physical Education', 'Drawing', 'General Knowledge', 'Sanskrit']
const emptyForm = { type: 'regular' as 'regular' | 'exam', class: '', day: '', subject: '', time: '', teacherName: '', date: '' }

export default function AdminTimetable() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'regular' | 'exam'>('regular')
  const [selectedClass, setSelectedClass] = useState('4')
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['timetable', tab, selectedClass],
    queryFn: async () =>
      (await http.get('/timetable', { params: { type: tab, class: selectedClass } })).data as { entries: TimetableEntry[] },
  })
  const entries = data?.entries ?? []

  const f = (k: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  // Auto-fetch teacher when subject is selected
  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subject = e.target.value
    setForm(p => ({ ...p, subject }))
    
    if (subject && form.class) {
      try {
        const res = await http.get('/subjects/teacher-by-subject', {
          params: { class: form.class, subject }
        })
        const { teacherName } = res.data
        if (teacherName) {
          setForm(p => ({ ...p, teacherName }))
        }
      } catch (err) {
        console.error('Failed to fetch teacher:', err)
      }
    }
  }

  const createMut = useMutation({
    mutationFn: async () => {
      const endpoint = form.type === 'exam' ? '/timetable/exam' : '/timetable'
      return (await http.post(endpoint, form)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable'] })
      setModalMode('none'); setForm({ ...emptyForm }); setError('')
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const editMut = useMutation({
    mutationFn: async () => (await http.put(`/timetable/${editEntry!.id}`, form)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timetable'] })
      setModalMode('none'); setEditEntry(null); setForm({ ...emptyForm }); setError('')
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/timetable/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timetable'] }),
  })

  const openCreate = () => {
    setForm({ ...emptyForm, type: tab, class: selectedClass })
    setError(''); setModalMode('create')
  }
  const openEdit = (e: TimetableEntry) => {
    setEditEntry(e)
    setForm({ type: e.type as any, class: e.class, day: e.day, subject: e.subject, time: e.time, teacherName: e.teacherName ?? '', date: e.date ?? '' })
    setError(''); setModalMode('edit')
  }
  const closeModal = () => { setModalMode('none'); setEditEntry(null); setError('') }
  const isOpen = modalMode !== 'none'
  const isPending = createMut.isPending || editMut.isPending
  useModalClose(isOpen, closeModal)

  // Group entries by day for clean table display
  const byDay = DAYS.reduce<Record<string, TimetableEntry[]>>((acc, d) => {
    acc[d] = entries.filter(e => e.day === d)
    return acc
  }, {})
  const hasAnyEntry = entries.length > 0

  return (
    <Page title="Timetable" subtitle="Manage class-wise regular and exam timetables"
      actions={
        <button type="button" onClick={openCreate}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Add Entry
        </button>
      }>

      {/* Type tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['regular', 'exam'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}>
            {t === 'regular' ? '📅 Regular Timetable' : '📝 Exam Timetable'}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Class selector */}
        <div className="lg:col-span-2 space-y-2">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Class</div>
          {CLASSES.map(c => (
            <button key={c} type="button" onClick={() => setSelectedClass(c)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                selectedClass === c
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}>
              Class {c}
            </button>
          ))}
        </div>

        {/* Timetable table */}
        <div className="lg:col-span-10">
          <Card>
            <CardHeader
              title={`Class ${selectedClass} — ${tab === 'regular' ? 'Regular' : 'Exam'} Timetable`}
              subtitle={`${entries.length} entries`}
            />
            <CardBody className="overflow-x-auto">
              {isLoading ? (
                <div className="py-6 text-sm text-slate-500">Loading...</div>
              ) : !hasAnyEntry ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No entries for Class {selectedClass}. Click "+ Add Entry" to start.
                </div>
              ) : tab === 'regular' ? (
                /* Day-grouped table for regular timetable */
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300 w-28">Day</th>
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Time</th>
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Teacher</th>
                      <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => {
                      const rows = byDay[day]
                      if (!rows.length) return null
                      return rows.map((e, i) => (
                        <tr key={e.id} className="border-b border-slate-100 dark:border-slate-900/60">
                          {i === 0 && (
                            <td rowSpan={rows.length}
                              className="py-3 pr-4 font-semibold text-indigo-600 dark:text-indigo-400 align-top">
                              {day}
                            </td>
                          )}
                          <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-slate-50">{e.subject}</td>
                          <td className="py-2.5 pr-4 text-slate-600 dark:text-slate-300">{e.time}</td>
                          <td className="py-2.5 pr-4 text-slate-500 text-xs">{e.teacherName || '—'}</td>
                          <td className="py-2.5 flex gap-2">
                            <button type="button" onClick={() => openEdit(e)}
                              className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                              Edit
                            </button>
                            <button type="button" disabled={deleteMut.isPending}
                              onClick={() => { if (confirm('Delete this entry?')) deleteMut.mutate(e.id) }}
                              className="rounded-xl bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    })}
                  </tbody>
                </table>
              ) : (
                /* Flat table for exam timetable */
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Day</th>
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                      <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Time</th>
                      <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => (
                      <tr key={e.id} className="border-b border-slate-100 dark:border-slate-900/60">
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-50">{e.subject}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.day}</td>
                        <td className="py-3 pr-4 text-slate-500 text-xs">{e.date || '—'}</td>
                        <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.time}</td>
                        <td className="py-3 flex gap-2">
                          <button type="button" onClick={() => openEdit(e)}
                            className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                            Edit
                          </button>
                          <button type="button" disabled={deleteMut.isPending}
                            onClick={() => { if (confirm('Delete this entry?')) deleteMut.mutate(e.id) }}
                            className="rounded-xl bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {modalMode === 'create' ? 'Add Timetable Entry' : 'Edit Entry'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
            </div>
            {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30">{error}</div>}
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Class *</span>
                  <select value={form.class} onChange={f('class')}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                    <option value="">Select class...</option>
                    {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Day *</span>
                  <select value={form.day} onChange={f('day')}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                    <option value="">Select day...</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
              </div>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Subject *</span>
                <select value={form.subject} onChange={handleSubjectChange}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select subject...</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Time *</span>
                  <input value={form.time} onChange={f('time')} placeholder="e.g. 10:00 AM"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Teacher Name (auto-filled)</span>
                  <input value={form.teacherName} onChange={f('teacherName')} placeholder="Auto-assigned from subject" readOnly
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-50 cursor-not-allowed" />
                </label>
              </div>
              {form.type === 'exam' && (
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Date</span>
                  <input value={form.date} onChange={f('date')} type="date"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
                </label>
              )}
              <button type="button" disabled={isPending || !form.class || !form.day || !form.subject || !form.time}
                onClick={() => modalMode === 'create' ? createMut.mutate() : editMut.mutate()}
                className="mt-1 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {isPending ? 'Saving...' : modalMode === 'create' ? 'Add Entry' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
