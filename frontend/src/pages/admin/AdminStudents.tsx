import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'
import { useModalClose } from '../../hooks/useModalClose'

type StudentProfile = { gender?: string; fatherName?: string; motherName?: string; dob?: string; religion?: string; fatherOccupation?: string; address?: string; className?: string; phone?: string; photoUrl?: string }
type StudentRow = { id: string; name: string; email: string; profile?: StudentProfile; uniqueId?: string }

const CLASSES = ['4', '5', '6', '7', '8']
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other']
const emptyForm = { name: '', password: '', gender: '', fatherName: '', motherName: '', dob: '', religion: '', fatherOccupation: '', address: '', className: '', phone: '' }

export default function AdminStudents() {
  const queryClient = useQueryClient()
  const [modalMode, setModalMode] = useState<'none' | 'create' | 'edit'>('none')
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['adminStudents'],
    queryFn: async () => (await http.get('/admin/students')).data as { students: StudentRow[] },
  })
  const students = data?.students ?? []

  const f = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const createMutation = useMutation({
    mutationFn: async () => {
      // Capture password before any state changes
      const capturedPassword = form.password
      const res = await http.post('/admin/students', form)
      const student = (res.data as { student: { id: string; uniqueId: string } }).student

      // Photo upload is optional — don't fail student creation if it errors
      if (photoFile) {
        try {
          const fd = new FormData()
          fd.append('photo', photoFile)
          await http.post(`/admin/students/${student.id}/photo`, fd)
        } catch {
          // photo upload failed silently — student is still created
        }
      }

      return { uniqueId: student.uniqueId, password: capturedPassword }
    },
    onSuccess: ({ uniqueId, password }) => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
      setModalMode('none')
      setForm({ ...emptyForm })
      setPhotoFile(null)
      setPhotoPreview(null)
      setError('')
      // Use setTimeout so modal closes first, then alert shows
      setTimeout(() => {
        alert(`✅ Student Created!\n\nLogin ID: ${uniqueId}\nPassword: ${password}\n\nShare these credentials with the student.`)
      }, 100)
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to create student'),
  })

  const editMutation = useMutation({
    mutationFn: async () => {
      await http.put(`/admin/students/${editStudent!.id}`, form)
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await http.post(`/admin/students/${editStudent!.id}/photo`, fd)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
      setModalMode('none')
      setEditStudent(null)
      setForm({ ...emptyForm })
      setPhotoFile(null)
      setPhotoPreview(null)
      setError('')
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to save changes'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await http.delete(`/admin/students/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminStudents'] }),
  })

  const openCreate = () => { setForm({ ...emptyForm }); setPhotoFile(null); setPhotoPreview(null); setError(''); setModalMode('create') }
  const openEdit = (s: StudentRow) => {
    setEditStudent(s)
    setForm({
      name: s.name, password: '',
      gender: s.profile?.gender ?? '',
      fatherName: s.profile?.fatherName ?? '',
      motherName: s.profile?.motherName ?? '',
      dob: s.profile?.dob ?? '',
      religion: s.profile?.religion ?? '',
      fatherOccupation: s.profile?.fatherOccupation ?? '',
      address: s.profile?.address ?? '',
      className: s.profile?.className ?? '',
      phone: s.profile?.phone ?? '',
    })
    setPhotoFile(null)
    setPhotoPreview(s.profile?.photoUrl ? `/api${s.profile.photoUrl}` : null)
    setError('')
    setModalMode('edit')
  }
  const closeModal = () => { setModalMode('none'); setEditStudent(null); setPhotoFile(null); setPhotoPreview(null); setError('') }

  const isOpen = modalMode !== 'none'
  const isPending = createMutation.isPending || editMutation.isPending
  useModalClose(isOpen, closeModal)

  return (
    <Page title="Students" subtitle="Manage student accounts"
      actions={
        <button type="button" onClick={openCreate}
          className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          + Add Student
        </button>
      }>

      <Card>
        <CardHeader title="All Students" subtitle={`${students.length} students`} />
        <CardBody className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Login ID</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Class</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Gender</th>
                <th className="py-2 pr-4 font-semibold text-slate-600 dark:text-slate-300">Father</th>
                <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="py-4 text-sm text-slate-500">Loading...</td></tr>}
              {students.map((s, i) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-900/60">
                  <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{i + 1}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded-lg bg-indigo-50 px-2 py-1 font-mono text-xs font-semibold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                      {s.uniqueId ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-50">{s.name}</td>
                  <td className="py-3 pr-4 text-slate-600">{s.profile?.className ? `Class ${s.profile.className}` : '—'}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">{s.profile?.gender ?? '—'}</td>
                  <td className="py-3 pr-4 text-slate-500 text-xs">{s.profile?.fatherName ?? '—'}</td>
                  <td className="py-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(s)}
                      className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                      Edit
                    </button>
                    <button type="button" disabled={deleteMutation.isPending}
                      onClick={() => { if (confirm(`Remove ${s.name}?`)) deleteMutation.mutate(s.id) }}
                      className="rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && students.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-sm text-slate-500">No students yet. Click "+ Add Student".</td></tr>
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
                {modalMode === 'create' ? 'Create Student' : 'Edit Student'}
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
                <input value={form.name} onChange={f('name')} placeholder="Student name"
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

            <div className="text-xs font-semibold text-slate-400 uppercase mb-2">Personal Details</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Gender</span>
                <select value={form.gender} onChange={f('gender')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Date of Birth</span>
                <input value={form.dob} onChange={f('dob')} type="date"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Father's Name</span>
                <input value={form.fatherName} onChange={f('fatherName')} placeholder="Father's full name"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Mother's Name</span>
                <input value={form.motherName} onChange={f('motherName')} placeholder="Mother's full name"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Religion</span>
                <select value={form.religion} onChange={f('religion')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select...</option>
                  {RELIGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Father's Occupation</span>
                <input value={form.fatherOccupation} onChange={f('fatherOccupation')} placeholder="e.g., Farmer"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Class</span>
                <select value={form.className} onChange={f('className')}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
                  <option value="">Select class...</option>
                  {CLASSES.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone</span>
                <input
                  value={form.phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setForm(p => ({ ...p, phone: val }))
                  }}
                  placeholder="10-digit number"
                  maxLength={10}
                  inputMode="numeric"
                  className={`h-10 rounded-xl border px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:bg-slate-900 dark:text-slate-50 ${
                    form.phone && form.phone.length !== 10
                      ? 'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800'
                  }`}
                />
                {form.phone && form.phone.length !== 10 && (
                  <span className="text-xs text-rose-500">{form.phone.length}/10 digits</span>
                )}
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Address</span>
                <input value={form.address} onChange={f('address')} placeholder="Full address"
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50" />
              </label>
            </div>

            <button type="button" disabled={isPending || (!!form.phone && form.phone.length !== 10)}
              onClick={() => modalMode === 'create' ? createMutation.mutate() : editMutation.mutate()}
              className="mt-5 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {isPending ? 'Saving...' : modalMode === 'create' ? 'Create Student' : 'Save Changes'}
            </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
