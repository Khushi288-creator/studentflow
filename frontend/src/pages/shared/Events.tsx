import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type EventRow = { id: string; title: string; date: string; description: string; status: string; time?: string; targetClass?: string; isRegistered?: boolean }
const emptyForm = { title: '', description: '', date: '', time: '', targetClass: 'All Classes', status: 'upcoming' as 'upcoming' | 'completed' }

const CLASS_OPTIONS = ['All Classes', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8']

export default function Events() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editItem, setEditItem] = useState<EventRow | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await http.get('/events')).data as { events: EventRow[] },
  })
  const events = data?.events ?? []

  const createMutation = useMutation({
    mutationFn: async () => (await http.post('/events', form)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); setModalMode('none'); setForm({ ...emptyForm }); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const editMutation = useMutation({
    mutationFn: async () => (await http.put(`/events/${editItem!.id}`, form)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); setModalMode('none'); setEditItem(null); setForm({ ...emptyForm }); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/events/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })

  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => (await http.post(`/events/${eventId}/register`)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); setActiveId('') },
  })

  const openEdit = (e: EventRow) => {
    setEditItem(e); setForm({ title: e.title, description: e.description, date: e.date, time: e.time ?? '', targetClass: e.targetClass ?? 'All Classes', status: e.status as any })
    setError(''); setModalMode('edit')
  }
  const closeModal = () => { setModalMode('none'); setEditItem(null); setError('') }
  const isOpen = modalMode !== 'none'
  const isPending = createMutation.isPending || editMutation.isPending
  useModalClose(isOpen, closeModal)

  return (
    <Page title="Events" subtitle="School events and activities"
      actions={isAdmin ? (
        <button type="button" onClick={() => { setForm({ ...emptyForm }); setError(''); setModalMode('create') }}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Add Event
        </button>
      ) : (
        <div className="rounded-2xl bg-indigo-600/10 px-4 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          Upcoming activities
        </div>
      )}>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && <div className="text-sm text-slate-500">Loading events...</div>}
        {events.map((e) => (
          <Card key={e.id}>
            <CardHeader title={e.title}
              subtitle={
                e.time
                  ? `📅 ${e.date}  •  🕒 ${new Date(`1970-01-01T${e.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
                  : `📅 ${e.date}`
              }
              right={
                <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                  e.status === 'completed'
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    : e.isRegistered
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                      : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                }`}>
                  {e.status === 'completed' ? 'Completed' : e.isRegistered ? 'Registered' : 'Upcoming'}
                </span>
              } />
            <CardBody className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">{e.description}</p>
              {e.targetClass && e.targetClass !== 'All Classes' && (
                <span className="inline-block rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/20 dark:text-violet-300">
                  🎓 {e.targetClass}
                </span>
              )}
              {isAdmin ? (
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(e)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                    Edit
                  </button>
                  <button type="button" disabled={deleteMutation.isPending}
                    onClick={() => { if (confirm(`Delete "${e.title}"?`)) deleteMutation.mutate(e.id) }}
                    className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30">
                    Delete
                  </button>
                </div>
              ) : e.status !== 'completed' ? (
                <button type="button"
                  disabled={e.isRegistered || activeId === e.id || registerMutation.isPending}
                  onClick={() => { setActiveId(e.id); registerMutation.mutate(e.id) }}
                  className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                  {e.isRegistered ? 'Already registered' : registerMutation.isPending && activeId === e.id ? 'Registering...' : 'Register'}
                </button>
              ) : null}
            </CardBody>
          </Card>
        ))}
        {!isLoading && events.length === 0 && (
          <Card className="border-dashed bg-white/40 p-8 text-center text-sm text-slate-500 dark:bg-slate-950/20">
            No events yet.
          </Card>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/30 dark:bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}>
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950 overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {modalMode === 'create' ? 'Add Event' : 'Edit Event'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>

            {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30">{error}</div>}

            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Event Details</div>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Event Name *</span>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Sports Day"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Date *</span>
                <input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} type="date"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Time <span className="text-slate-400 font-normal">(optional)</span>
                </span>
                <input
                  value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  type="time"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                />
                {form.time && (
                  <span className="text-[11px] text-indigo-500">
                    🕒 {new Date(`1970-01-01T${form.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                )}
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Target Class</span>
                <select value={form.targetClass} onChange={e => setForm(p => ({ ...p, targetClass: e.target.value }))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  {CLASS_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Status</span>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Description *</span>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  placeholder="Event details..."
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 resize-none" />
              </label>
            </div>

            <button type="button" disabled={isPending || !form.title || !form.date || !form.description}
              onClick={() => modalMode === 'create' ? createMutation.mutate() : editMutation.mutate()}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {isPending ? 'Saving...' : modalMode === 'create' ? 'Add Event' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </Page>
  )
}
