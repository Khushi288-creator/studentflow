import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../../api/http'
import { useAuthStore } from '../../../store/authStore'
import { Card, CardBody, CardHeader } from '../../../components/ui/Card'

function val(v?: string | null) { return v?.trim() || '—' }

export default function TeacherBioCard() {
  const { user } = useAuthStore()
  const [imgError, setImgError] = useState(false)

  const { data } = useQuery({
    queryKey: ['teacherMe'],
    queryFn: async () => {
      const res = await http.get('/teachers/me')
      return res.data as { teacher: { subject?: string; phone?: string; address?: string; bloodType?: string; birthday?: string; sex?: string; photoUrl?: string } | null }
    },
    retry: false,
  })

  const t = data?.teacher
  const photoSrc = t?.photoUrl ?? null
  const showPhoto = !!photoSrc && !imgError

  return (
    <Card className="h-full min-h-0 overflow-hidden">
      <CardHeader title="Teacher Bio" subtitle="Profile & personal details" />
      <CardBody className="min-h-0 space-y-2">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-indigo-50 dark:border-slate-800 dark:bg-indigo-950/20">
            {showPhoto ? (
              <img
                src={photoSrc}
                alt={user?.name ?? 'Teacher'}
                className="h-full w-full object-cover"
                onError={() => {
                  console.warn('[TeacherBioCard] photo failed to load:', photoSrc)
                  setImgError(true)
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-indigo-400 dark:text-indigo-300">
                {user?.name?.charAt(0).toUpperCase() ?? 'T'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{user?.name ?? '—'}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {user?.email
                ? <a href={`mailto:${user.email}`} className="hover:underline text-indigo-600 dark:text-indigo-400">{user.email}</a>
                : '—'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Phone: {val(t?.phone)}</div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
          <div className="mb-1 text-[11px] font-semibold text-slate-500">Personal details</div>
          <div className="grid gap-0.5">
            {[
              { label: 'Subject', value: t?.subject },
              { label: 'Gender', value: t?.sex },
              { label: 'Blood Type', value: t?.bloodType },
              { label: 'Birthday', value: t?.birthday },
              { label: 'Address', value: t?.address },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-[44%_56%] items-baseline gap-x-2 text-[11px] leading-tight">
                <span className="text-slate-500 dark:text-slate-400">{row.label}</span>
                <span className="font-medium text-slate-900 dark:text-slate-50 break-words">{val(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
