import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type Holiday = { id: string; name: string; date: string }

export default function Holidays() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editItem, setEditItem] = useState<Holiday | null>(null)
  const [form, setForm] = useState({ name: '', date: '' })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => (await http.get('/holidays')).data as { holidays: Holiday[] },
  })
  const holidays = data?.holidays ?? []

  const createMutation = useMutation({
    mutationFn: async () => (await http.post('/holidays', form)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setModalMode('none'); setForm({ name: '', date: '' }); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const editMutation = useMutation({
    mutationFn: async () => (await http.put(`/holidays/${editItem!.id}`, form)).data,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setModalMode('none'); setEditItem(null); setForm({ name: '', date: '' }); setError('') },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/holidays/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['holidays'] }),
  })

  const openEdit = (h: Holiday) => { setEditItem(h); setForm({ name: h.name, date: h.date }); setError(''); setModalMode('edit') }
  const closeModal = () => { setModalMode('none'); setEditItem(null); setError('') }
  const isOpen = modalMode !== 'none'
  const isPending = createMutation.isPending || editMutation.isPending
  useModalClose(isOpen, closeModal)

  return (
    <Page title="Holidays" subtitle="School holiday calendar"
      actions={isAdmin ? (
        <button type="button" onClick={() => { setForm({ name: '', date: '' }); setError(''); setModalMode('create') }}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Add Holiday
        </button>
      ) : undefined}>

      <Card>
        <CardHeader title="Holiday List" subtitle={`${holidays.length} holidays`} />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Holiday Name</th>
                <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                {isAdmin && <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={4} className="py-4 text-sm text-slate-500">Loading...</td></tr>}
              {holidays.map((h, i) => (
                <tr key={h.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-3 pr-6 text-slate-500 dark:text-slate-400">{i + 1}</td>
                  <td className="py-3 pr-6 font-medium text-slate-900 dark:text-slate-50">{h.name}</td>
                  <td className="py-3 pr-6 text-slate-600 dark:text-slate-300">{h.date}</td>
                  {isAdmin && (
                    <td className="py-3 flex gap-2">
                      <button type="button" onClick={() => openEdit(h)}
                        className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                        Edit
                      </button>
                      <button type="button" disabled={deleteMutation.isPending}
                        onClick={() => { if (confirm(`Delete "${h.name}"?`)) deleteMutation.mutate(h.id) }}
                        className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30">
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!isLoading && holidays.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-sm text-slate-500">No holidays added yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/30 dark:bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {modalMode === 'create' ? 'Add Holiday' : 'Edit Holiday'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>
            {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Holiday Name *</span>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Diwali"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Date *</span>
                <input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} type="date"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <button type="button" disabled={isPending || !form.name || !form.date}
                onClick={() => modalMode === 'create' ? createMutation.mutate() : editMutation.mutate()}
                className="mt-2 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {isPending ? 'Saving...' : modalMode === 'create' ? 'Add Holiday' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
