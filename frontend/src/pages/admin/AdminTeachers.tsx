import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type TeacherProfile = { subject: string; phone?: string; address?: string; bloodType?: string; birthday?: string; sex?: string; photoUrl?: string }
type TeacherRow = { id: string; name: string; email: string; subject?: string; profile?: TeacherProfile; uniqueId?: string }

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Gujarati', 'Social Science', 'Computer', 'Physical Education']
const emptyForm = { name: '', password: '', subject: '', phone: '', address: '', bloodType: '', birthday: '', sex: '' }

export default function AdminTeachers() {
  const queryClient = useQueryClient()
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editTeacher, setEditTeacher] = useState<TeacherRow | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: async () => (await http.get('/admin/teachers')).data as { teachers: TeacherRow[] },
  })
  const teachers = data?.teachers ?? []

  const f = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const createMutation = useMutation({
    mutationFn: async () => {
      const capturedPassword = form.password
      const res = await http.post('/admin/teachers', form)
      const teacher = (res.data as { teacher: { id: string; uniqueId: string } }).teacher
      if (photoFile) {
        try {
          const fd = new FormData()
          fd.append('photo', photoFile)
          await http.post(`/admin/teachers/${teacher.id}/photo`, fd)
        } catch {
          // photo upload failed silently — teacher is still created
        }
      }
      return { uniqueId: teacher.uniqueId, password: capturedPassword }
    },
    onSuccess: ({ uniqueId, password }) => {
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] })
      setModalMode('none')
      setForm({ ...emptyForm })
      setPhotoFile(null)
      setPhotoPreview(null)
      setError('')
      setTimeout(() => {
        alert(`✅ Teacher Created!\n\nLogin ID: ${uniqueId}\nPassword: ${password}\n\nShare these credentials with the teacher.`)
      }, 100)
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to create teacher'),
  })

  const editMutation = useMutation({
    mutationFn: async () => {
      await http.put(`/admin/teachers/${editTeacher!.id}`, form)
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await http.post(`/admin/teachers/${editTeacher!.id}/photo`, fd)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] })
      setModalMode('none')
      setEditTeacher(null)
      setForm({ ...emptyForm })
      setPhotoFile(null)
      setPhotoPreview(null)
      setError('')
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to save changes'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/admin/teachers/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminTeachers'] }),
  })

  const openCreate = () => { setForm({ ...emptyForm }); setPhotoFile(null); setPhotoPreview(null); setError(''); setModalMode('create') }
  const openEdit = (t: TeacherRow) => {
    setEditTeacher(t)
    setForm({
      name: t.name, password: '',
      subject: t.profile?.subject ?? t.subject ?? '',
      phone: t.profile?.phone ?? '',
      address: t.profile?.address ?? '',
      bloodType: t.profile?.bloodType ?? '',
      birthday: t.profile?.birthday ?? '',
      sex: t.profile?.sex ?? '',
    })
    setPhotoFile(null)
    setPhotoPreview(t.profile?.photoUrl ? `/api${t.profile.photoUrl}` : null)
    setError('')
    setModalMode('edit')
  }
  const closeModal = () => { setModalMode('none'); setEditTeacher(null); setPhotoFile(null); setPhotoPreview(null); setError('') }

  const isOpen = modalMode !== 'none'
  const isPending = createMutation.isPending || editMutation.isPending
  useModalClose(isOpen, closeModal)

  const validateAndSubmit = () => {
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setError('Invalid number — phone must be exactly 10 digits')
      return
    }
    modalMode === 'create' ? createMutation.mutate() : editMutation.mutate()
  }

  return (
    <Page title="Teachers" subtitle="Manage teacher accounts"
      actions={
        <button type="button" onClick={openCreate}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Add Teacher
        </button>
      }>

      <Card>
        <CardHeader title="All Teachers" subtitle={`${teachers.length} teachers`} />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Login ID</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Phone</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Address</th>
                <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="py-4 text-sm text-slate-500">Loading...</td></tr>}
              {teachers.map((t, i) => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-lg bg-violet-50 px-2 py-1 font-mono text-xs font-semibold text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                      {t.uniqueId ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-50">{t.name}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300">{t.profile?.subject ?? t.subject ?? '—'}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">{t.profile?.phone ?? '—'}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs max-w-[120px] truncate">{t.profile?.address ?? '—'}</td>
                  <td className="py-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(t)}
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                      Edit
                    </button>
                    <button type="button" disabled={deleteMutation.isPending}
                      onClick={() => { if (confirm(`Remove ${t.name}?`)) deleteMutation.mutate(t.id) }}
                      className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && teachers.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-sm text-slate-500">No teachers yet. Click "+ Add Teacher".</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Modal — inline JSX, NOT a nested component, so inputs don't lose focus */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={closeModal}>
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950 flex flex-col"
            style={{ maxHeight: 'min(90vh, 700px)', marginTop: 'auto', marginBottom: 'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Fixed header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {modalMode === 'create' ? 'Create Teacher' : 'Edit Teacher'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-700 text-xl leading-none">✕</button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 pb-6 flex-1">
            {error && <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30">{error}</div>}

            {/* Photo upload */}
            <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-4 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl text-slate-400 dark:text-slate-500">👤</div>
                )}
              </div>
              <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                {photoPreview ? '📷 Change Photo' : '📷 Upload Photo'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0] ?? null
                    setPhotoFile(file)
                    setPhotoPreview(file ? URL.createObjectURL(file) : null)
                  }} />
              </label>
              {photoFile && <span className="text-xs text-slate-500 truncate max-w-[180px]">{photoFile.name}</span>}
            </div>

            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Authentication</div>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name *</span>
                <input value={form.name} onChange={f('name')} placeholder="First Last"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password {modalMode === 'edit' ? '(blank = keep)' : '*'}
                </span>
                <input value={form.password} onChange={f('password')} type="password" placeholder="Min 6 characters"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
            </div>

            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Personal Information</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Subject *</span>
                <select value={form.subject} onChange={f('subject')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select subject...</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone</span>
                <input value={form.phone} onChange={f('phone')} placeholder="10-digit number"
                  maxLength={10}
                  className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:bg-slate-900 dark:text-slate-50
                    ${form.phone && !/^\d{10}$/.test(form.phone) ? 'border-rose-400 bg-rose-50 dark:border-rose-600' : 'border-slate-200 bg-white dark:border-slate-800'}`} />
                {form.phone && !/^\d{10}$/.test(form.phone) && (
                  <span className="text-xs text-rose-600">Invalid number — must be exactly 10 digits</span>
                )}
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Blood Type</span>
                <select value={form.bloodType} onChange={f('bloodType')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select...</option>
                  {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Birthday</span>
                <input value={form.birthday} onChange={f('birthday')} type="date"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Gender</span>
                <select value={form.sex} onChange={f('sex')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Address</span>
                <input value={form.address} onChange={f('address')} placeholder="Full address"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
            </div>

            <button type="button" disabled={isPending}
              onClick={validateAndSubmit}
              className="mt-5 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {isPending ? 'Saving...' : modalMode === 'create' ? 'Create Teacher' : 'Save Changes'}
            </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
