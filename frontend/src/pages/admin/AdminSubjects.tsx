import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '../../api/http'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Page } from '../../components/ui/Page'

type CourseRow = { id: string; name: string; teacherName?: string }
type TeacherRow = { id: string; name: string; email: string; role: string; subject?: string }

export default function AdminSubjects() {
  const queryClient = useQueryClient()
  const [courseName, setCourseName] = useState('')
  const [teacherId, setTeacherId] = useState('')

  const coursesQuery = useQuery({
    queryKey: ['adminCourses'],
    queryFn: async () => (await http.get('/admin/courses')).data as { courses: CourseRow[] },
  })
  const teachersQuery = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: async () => (await http.get('/admin/teachers')).data as { teachers: TeacherRow[] },
  })

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; teacherId: string }) =>
      (await http.post('/admin/courses', body)).data,
    onSuccess: () => {
      setCourseName('')
      setTeacherId('')
      queryClient.invalidateQueries({ queryKey: ['adminCourses'] })
    },
  })

  const courses = coursesQuery.data?.courses ?? []
  const teachers = teachersQuery.data?.teachers ?? []

  return (
    <Page title="Subjects" subtitle="Manage school subjects and assign teachers">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Create form */}
        <Card>
          <CardHeader title="Create Subject" subtitle="Assign a teacher to a new subject" />
          <CardBody>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Subject Name</span>
                <input
                  value={courseName}
                  onChange={e => setCourseName(e.target.value)}
                  placeholder="e.g., Mathematics"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Teacher</span>
                <select
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
                >
                  <option value="">Select teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <button
                type="button"
                disabled={!courseName || !teacherId || createMutation.isPending}
                onClick={() => createMutation.mutate({ name: courseName, teacherId })}
                className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Subject'}
              </button>
              {createMutation.isSuccess && <p className="text-xs text-emerald-600">Subject created.</p>}
            </div>
          </CardBody>
        </Card>

        {/* Subject list */}
        <Card>
          <CardHeader title="Active Subjects" subtitle={`${courses.length} subjects`} />
          <CardBody className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-6 font-semibold text-slate-600 dark:text-slate-300">Subject</th>
                  <th className="py-2 font-semibold text-slate-600 dark:text-slate-300">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {coursesQuery.isLoading && (
                  <tr><td colSpan={2} className="py-4 text-sm text-slate-500">Loading...</td></tr>
                )}
                {courses.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-900/60">
                    <td className="py-3 pr-6 font-medium text-slate-900 dark:text-slate-50">{c.name}</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">{c.teacherName ?? '—'}</td>
                  </tr>
                ))}
                {!coursesQuery.isLoading && courses.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-sm text-slate-500">No subjects yet.</td></tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}
