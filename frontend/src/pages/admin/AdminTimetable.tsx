import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type TimetableEntry = { id: string; type: string; class: string; subject: string; date?: string; time: string }
const CLASSES = ['4', '5', '6', '7', '8']
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Gujarati', 'Social Science', 'Computer', 'Physical Education']
const emptyForm = { type: 'regular' as 'regular' | 'exam', class: '', subject: '', date: '', time: '' }

export default function AdminTimetable() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'regular' | 'exam'>('regular')
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editEntry, setEditEntry] = useState<TimetableEntry | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => (await http.get('/timetable')).data as { entries: TimetableEntry[] },
  })
  const allEntries = data?.entries ?? []
  const entries = allEntries.filter(e => e.type === tab)

  const f = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const createMutation = useMutation({
    mutationFn: async () => (await http.post('/timetable', form)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timetable'] }); setModalMode('none'); setForm({ ...emptyForm }); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const editMutation = useMutation({
    mutationFn: async () => (await http.put(`/timetable/${editEntry!.id}`, form)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['timetable'] }); setModalMode('none'); setEditEntry(null); setForm({ ...emptyForm }); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/timetable/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timetable'] }),
  })

  const openCreate = () => { setForm({ ...emptyForm, type: tab }); setError(''); setModalMode('create') }
  const openEdit = (e: TimetableEntry) => {
    setEditEntry(e)
    setForm({ type: e.type as any, class: e.class, subject: e.subject, date: e.date ?? '', time: e.time })
    setError(''); setModalMode('edit')
  }
  const closeModal = () => { setModalMode('none'); setEditEntry(null); setError('') }
  const isOpen = modalMode !== 'none'
  const isPending = createMutation.isPending || editMutation.isPending
  useModalClose(isOpen, closeModal)

  return (
    <Page title="Timetable" subtitle="Manage regular and exam timetables"
      actions={
        <button type="button" onClick={openCreate}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Add Entry
        </button>
      }>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {(['regular', 'exam'] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === t ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}>
            {t === 'regular' ? 'Regular Timetable' : 'Exam Timetable'}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title={tab === 'regular' ? 'Regular Timetable' : 'Exam Timetable'} subtitle={`${entries.length} entries`} />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Class</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Time</th>
                {tab === 'exam' && <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Date</th>}
                <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="py-4 text-sm text-slate-500">Loading...</td></tr>}
              {entries.map(e => (
                <tr key={e.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-50">{e.subject}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">Class {e.class}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.time}</td>
                  {tab === 'exam' && <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{e.date ?? '—'}</td>}
                  <td className="py-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(e)}
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                      Edit
                    </button>
                    <button type="button" disabled={deleteMutation.isPending}
                      onClick={() => { if (confirm('Delete this entry?')) deleteMutation.mutate(e.id) }}
                      className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && entries.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-sm text-slate-500">No entries yet. Click "+ Add Entry".</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/30 dark:bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {modalMode === 'create' ? 'Add Timetable Entry' : 'Edit Entry'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>
            {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Type</span>
                <select value={form.type} onChange={f('type')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="regular">Regular</option>
                  <option value="exam">Exam</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Subject</span>
                <select value={form.subject} onChange={f('subject')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select subject...</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Class</span>
                <select value={form.class} onChange={f('class')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select class...</option>
                  {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Time</span>
                <input value={form.time} onChange={f('time')} placeholder="e.g. 10:00 AM"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              {form.type === 'exam' && (
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Date</span>
                  <input value={form.date} onChange={f('date')} type="date"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
                </label>
              )}
              <button type="button" disabled={isPending}
                onClick={() => modalMode === 'create' ? createMutation.mutate() : editMutation.mutate()}
                className="mt-2 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {isPending ? 'Saving...' : modalMode === 'create' ? 'Add Entry' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
