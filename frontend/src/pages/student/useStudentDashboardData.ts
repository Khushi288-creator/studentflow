import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../api/http'
import { useAuthStore } from '../../store/authStore'
import { useAttendanceStore } from '../../store/attendanceStore'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'halfDay'

export type AttendanceRecord = {
  date: string
  status: AttendanceStatus | (string & {})
}

export type StudentDetails = {
  photoUrl?: string
  enrollmentId?: string
  phone?: string

  gender?: string
  fatherName?: string
  motherName?: string
  dob?: string
  religion?: string
  fatherOccupation?: string
  address?: string
  className?: string
  section?: string
}

export type AssignmentDashboardRow = {
  id: string
  subject?: string
  status?: 'Pending' | 'Completed'
}

export type EventRow = {
  id: string
  title: string
  date: string
  description?: string
  time?: string
}

export type FeeRow = {
  id: string
  amount: number
  status: string
}

export type TimetableEntry = {
  id?: string
  type?: string
  class?: string
  time?: string
  subject?: string
  date?: string
}

function safeNumber(n: unknown) {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

export function useStudentDashboardData() {
  const { user } = useAuthStore()

  const studentDetailsQuery = useQuery({
    queryKey: ['studentDetails'],
    queryFn: async () => {
      const res = await http.get('/students/me')
      return res.data as { student?: StudentDetails }
    },
    retry: false,
  })

  const attendanceQuery = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const res = await http.get('/attendance')
      return res.data as { attendance?: { id: string; courseId: string; date: string; status: string }[] }
    },
  })

  const assignmentsQuery = useQuery({
    queryKey: ['dashboardAssignments'],
    queryFn: async () => {
      const res = await http.get('/assignments', { params: { limit: 6 } })
      return res.data as { assignments?: unknown[] }
    },
    retry: false,
  })

  const eventsQuery = useQuery({
    queryKey: ['dashboardEvents'],
    queryFn: async () => {
      const res = await http.get('/events/upcoming')
      return res.data as { events?: EventRow[] }
    },
    retry: false,
    refetchInterval: 30000,
  })

  const holidaysQuery = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const res = await http.get('/holidays')
      return res.data as { holidays?: { id: string; name: string; date: string }[] }
    },
    retry: false,
  })

  const feesQuery = useQuery({
    queryKey: ['dashboardFees'],
    queryFn: async () => {
      const res = await http.get('/fees')
      return res.data as { fees?: FeeRow[] }
    },
    retry: false,
  })

  const regularTimetableQuery = useQuery({
    queryKey: ['regularTimetable'],
    queryFn: async () => {
      const res = await http.get('/timetable', { params: { type: 'regular' } })
      return res.data as { entries?: TimetableEntry[] }
    },
    retry: false,
  })

  const examTimetableQuery = useQuery({
    queryKey: ['examTimetable'],
    queryFn: async () => {
      const res = await http.get('/timetable', { params: { type: 'exam' } })
      return res.data as { entries?: TimetableEntry[] }
    },
    retry: false,
  })

  const student = studentDetailsQuery.data?.student

  // Subscribe to store — same as Attendance.tsx
  const allStoreRecords = useAttendanceStore((s) => s.records)

  const attendanceRecords: AttendanceRecord[] = useMemo(() => {
    type Row = { courseId: string; date: string; status: string }

    // Backend rows
    const backendRows: Row[] = (attendanceQuery.data?.attendance ?? []).map((r) => ({
      courseId: r.courseId,
      date: r.date,
      status: r.status,
    }))

    // Store rows filtered by logged-in student name — EXACT same as Attendance.tsx
    const teacherRows: Row[] = user?.name
      ? allStoreRecords
          .filter((r) => r.studentName.toLowerCase() === user.name.toLowerCase())
          .map((r) => ({ courseId: r.courseId, date: r.date, status: r.status }))
      : []

    // Merge: store overrides backend for same courseId+date
    const result = [...backendRows]
    for (const tr of teacherRows) {
      const idx = result.findIndex((r) => r.courseId === tr.courseId && r.date === tr.date)
      if (idx >= 0) result[idx] = tr
      else result.push(tr)
    }

    return result.map((r) => ({ date: r.date, status: r.status as AttendanceStatus }))
  }, [allStoreRecords, attendanceQuery.data?.attendance, user?.name])

  const attendance = useMemo(() => {
    const totalDays = attendanceRecords.length
    const present = attendanceRecords.filter((r) => r.status === 'present').length
    const absent = attendanceRecords.filter((r) => r.status === 'absent').length
    const late = attendanceRecords.filter((r) => r.status === 'late' || r.status === 'halfDay' || r.status === 'half').length
    return { totalDays, present, absent, late }
  }, [attendanceRecords])

  const assignments: AssignmentDashboardRow[] = useMemo(() => {
    const raw = assignmentsQuery.data?.assignments ?? []
    return raw
      .map((x: any) => {
        const subject = x?.courseName ?? x?.subject ?? x?.courseId
        const status: AssignmentDashboardRow['status'] =
          x?.status === 'completed' || x?.isSubmitted === true || x?.submitted === true
            ? ('Completed' as const)
            : x?.status === 'pending'
              ? ('Pending' as const)
              : undefined
        return {
          id: String(x?.id ?? ''),
          subject: typeof subject === 'string' ? subject : undefined,
          status,
        }
      })
      .filter((x) => x.id)
  }, [assignmentsQuery.data?.assignments])

  const events = useMemo(() => {
    const evRows = (eventsQuery.data?.events ?? []).filter(e => (e as any).status !== 'completed').slice(0, 3)
    const holRows = (holidaysQuery.data?.holidays ?? []).slice(0, 2).map(h => ({
      id: h.id, title: h.name, date: h.date, description: 'Holiday',
    }))
    return [...evRows, ...holRows]
  }, [eventsQuery.data?.events, holidaysQuery.data?.holidays])

  const fees = feesQuery.data?.fees ?? []
  const feeTotals = useMemo(() => {
    const total = fees.reduce((acc, f) => acc + safeNumber(f.amount), 0)
    const paid = fees
      .filter((f) => String(f.status).toLowerCase() === 'paid')
      .reduce((acc, f) => acc + safeNumber(f.amount), 0)
    const pending = Math.max(0, total - paid)
    const status = fees.length === 0 ? undefined : pending === 0 ? 'Paid' : paid === 0 ? 'Unpaid' : 'Partial'
    return { total, paid, pending, status }
  }, [fees])

  return {
    authUser: user,
    student,
    queries: {
      studentDetailsQuery,
      attendanceQuery,
      assignmentsQuery,
      eventsQuery,
      holidaysQuery,
      feesQuery,
      regularTimetableQuery,
      examTimetableQuery,
    },
    computed: {
      attendance,
      assignments,
      events,
      fees,
      feeTotals,
      regularTimetable: regularTimetableQuery.data?.entries ?? [],
      examTimetable: examTimetableQuery.data?.entries ?? [],
    },
  }
}

