import express from 'express'
import { prisma } from '../lib/prisma'
import { authenticateJWT } from '../middleware/auth'

const router = express.Router()

// Admin summary endpoint
router.get('/dashboard/admin/summary', authenticateJWT, async (req, res) => {
  try {
    const totalStudents = await prisma.user.count({ where: { role: 'student' } })
    const totalTeachers = await prisma.user.count({ where: { role: 'teacher' } })
    const totalAdmins = await prisma.user.count({ where: { role: 'admin' } })
    const totalSubjects = await prisma.course.count()
    const totalAssignments = await prisma.assignment.count()

    // Attendance last 7 days by day
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    const attendanceByDay: { day: string; present: number; absent: number }[] = []
    let totalPresent = 0, totalAttendance = 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0,0,0,0)
      const next = new Date(d); next.setDate(next.getDate() + 1)
      const present = await prisma.attendance.count({ where: { date: { gte: d, lt: next }, status: 'present' } })
      const absent = await prisma.attendance.count({ where: { date: { gte: d, lt: next }, status: 'absent' } })
      totalPresent += present
      totalAttendance += present + absent
      attendanceByDay.push({ day: days[d.getDay() === 0 ? 6 : d.getDay() - 1], present, absent })
    }
    const attendancePct = totalAttendance > 0 ? Math.round((totalPresent / totalAttendance) * 100) : 0

    // Fees summary
    const fees = await prisma.fee.findMany({ select: { amount: true, status: true } })
    const totalFees = fees.reduce((a, f) => a + f.amount, 0)
    const paidFees = fees.filter(f => f.status === 'paid').reduce((a, f) => a + f.amount, 0)
    const pendingFees = fees.filter(f => f.status !== 'paid').reduce((a, f) => a + f.amount, 0)

    // Events upcoming
    const events = await prisma.event.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take: 5,
      select: { id: true, title: true, description: true, date: true, time: true },
    })

    // Recent notices/announcements
    const notices = await prisma.notice.findMany({
      where: { userId: null },
      orderBy: { date: 'desc' },
      take: 5,
      select: { id: true, title: true, description: true, date: true },
    })

    res.json({
      stats: { totalStudents, totalTeachers, totalAdmins, totalSubjects, totalAssignments, attendancePct },
      attendanceByDay,
      fees: { total: totalFees, paid: paidFees, pending: pendingFees },
      events: events.map((e: any) => ({
        id: e.id, title: e.title, description: e.description,
        date: e.date instanceof Date ? e.date.toISOString().slice(0,10) : String(e.date ?? '').slice(0,10),
        time: e.time ?? '',
      })),
      notices: notices.map((n: any) => ({
        id: n.id, title: n.title, description: n.description,
        date: n.date instanceof Date ? n.date.toISOString().slice(0,10) : String(n.date ?? '').slice(0,10),
      })),
    })
  } catch (err) {
    console.error('[GET /dashboard/admin/summary]', err)
    res.status(500).json({ message: 'Failed' })
  }
})

// Teacher dashboard summary
router.get('/dashboard/teacher/summary', authenticateJWT, async (req, res) => {
  try {
    if (req.auth!.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' })

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true, subject: true },
    })
    if (!teacher) return res.json({ summary: null })

    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, name: true },
    })
    const courseIds = courses.map(c => c.id)

    // Total students enrolled in teacher's courses (unique)
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { courseId: { in: courseIds } },
      select: { userId: true },
    })
    const uniqueStudents = new Set(enrollments.map(e => e.userId)).size

    // Assignments
    const assignments = await prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    })
    const assignmentIds = assignments.map(a => a.id)
    const totalAssignments = assignments.length

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: { in: assignmentIds } },
      select: { id: true, marks: true, student: { select: { userId: true, user: { select: { name: true } } } } },
    })
    const submittedCount = submissions.length
    const pendingCount = Math.max(0, totalAssignments * uniqueStudents - submittedCount)

    // Today's attendance
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const todayAttendance = await prisma.attendance.findMany({
      where: { courseId: { in: courseIds }, date: { gte: today, lt: tomorrow } },
      select: { status: true, student: { select: { user: { select: { name: true } } } } },
    })
    const presentToday = todayAttendance.filter(a => a.status === 'present').length
    const absentToday = todayAttendance.filter(a => a.status === 'absent').length
    const lateToday = todayAttendance.filter(a => a.status === 'late').length

    // Performance — marks per student
    const marksData = submissions.filter(s => s.marks != null)
    const avgMarks = marksData.length
      ? Math.round(marksData.reduce((acc, s) => acc + (s.marks ?? 0), 0) / marksData.length)
      : null

    // Weak students (marks < 60)
    const studentMarksMap = new Map<string, { name: string; marks: number[] }>()
    for (const s of marksData) {
      const name = s.student.user.name
      const uid = s.student.userId
      if (!studentMarksMap.has(uid)) studentMarksMap.set(uid, { name, marks: [] })
      studentMarksMap.get(uid)!.marks.push(s.marks!)
    }
    const weakStudents = Array.from(studentMarksMap.entries())
      .map(([uid, d]) => ({
        userId: uid,
        name: d.name,
        avg: Math.round(d.marks.reduce((a, b) => a + b, 0) / d.marks.length),
      }))
      .filter(s => s.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5)

    // Weekly marks trend (last 4 weeks)
    const marksTrend = [1,2,3,4].map(w => {
      const weekSubmissions = marksData.slice(
        Math.max(0, marksData.length - w * Math.ceil(marksData.length / 4)),
        marksData.length - (w-1) * Math.ceil(marksData.length / 4)
      )
      const avg = weekSubmissions.length
        ? Math.round(weekSubmissions.reduce((a, s) => a + (s.marks ?? 0), 0) / weekSubmissions.length)
        : 0
      return { label: `Week ${5-w}`, value: avg }
    }).reverse()

    res.json({
      totalStudents: uniqueStudents,
      subjects: courses.map(c => c.name),
      totalAssignments,
      submittedCount,
      pendingCount,
      attendance: { present: presentToday, absent: absentToday, late: lateToday },
      avgMarks,
      weakStudents,
      marksTrend,
    })
  } catch (err) {
    console.error('[GET /dashboard/teacher/summary]', err)
    res.status(500).json({ message: 'Failed' })
  }
})

router.get('/dashboard/student/summary', authenticateJWT, async (req, res) => {
  try {
    const role = req.auth!.role
    if (role !== 'student' && role !== 'teacher' && role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    if (role !== 'student') return res.json({ summary: null })

    const now = new Date()
    const nowPlus14 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { userId: req.auth!.userId },
      select: { id: true, courseId: true },
    })

    const courseIds = enrollments.map((e) => e.courseId)
    const studentIds = enrollments.map((e) => e.id)

    const totalCourses = courseIds.length

    const assignments = await prisma.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        dueDate: { gte: now },
      },
      orderBy: { dueDate: 'asc' },
      select: { id: true, dueDate: true, courseId: true },
    })

    let pendingAssignments = 0
    const upcomingAssignments = assignments.filter((a) => a.dueDate <= nowPlus14)

    for (const a of assignments) {
      const hasSubmission = await prisma.submission.findFirst({
        where: {
          assignmentId: a.id,
          studentId: { in: studentIds },
        },
        select: { id: true },
      })
      if (!hasSubmission) pendingAssignments += 1
    }

    const attendanceRows = await prisma.attendance.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, status: true },
    })
    const totalAttendance = attendanceRows.length
    const presentCount = attendanceRows.filter((r) => r.status === 'present').length
    const attendancePercentage = totalAttendance === 0 ? 0 : Math.round((presentCount / totalAttendance) * 100)

    const anyFee = await prisma.fee.findFirst({
      where: { studentId: { in: studentIds } },
      orderBy: { createdAt: 'desc' },
    })
    const feeStatus = anyFee?.status ?? 'pending'

    // Fees pending amount
    const allFees = await prisma.fee.findMany({ where: { studentId: { in: studentIds } } })
    const feesPending = allFees.filter(f => f.status !== 'paid').reduce((a, f) => a + f.amount, 0)

    const submissions = await prisma.submission.findMany({
      where: {
        studentId: { in: studentIds },
        marks: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { marks: true, assignmentId: true, createdAt: true },
    })

    const marksTrend = submissions
      .slice()
      .reverse()
      .map((s, idx) => ({
        label: `W${idx + 1}`,
        value: s.marks ?? 0,
      }))

    // Latest result percentage
    const latestResult = submissions[0]
    const latestResultPct = latestResult?.marks ?? null

    res.json({
      totalCourses,
      pendingAssignments,
      attendancePercentage,
      feeStatus,
      feesPending,
      latestResultPct,
      upcomingExams: upcomingAssignments.length,
      marksTrend: marksTrend.length
        ? marksTrend
        : [
            { label: 'W1', value: 0 },
            { label: 'W2', value: 0 },
            { label: 'W3', value: 0 },
            { label: 'W4', value: 0 },
          ],
    })
  } catch (err) {
    console.error('[GET /dashboard/student/summary]', err)
    res.status(500).json({ message: 'Failed to load dashboard summary' })
  }
})

// Quick Stats for Teacher Dashboard
router.get('/dashboard/teacher/quick-stats', authenticateJWT, async (req, res) => {
  try {
    if (req.auth!.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' })

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true },
    })
    if (!teacher) return res.json({ 
      totalStudents: 0, avgAttendance: 0, assignmentsGraded: 0, 
      avgClassPerformance: 0, topPerformer: null, improvementNeeded: 0 
    })

    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    })
    const courseIds = courses.map(c => c.id)

    // Total unique students
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { courseId: { in: courseIds } },
      select: { userId: true, id: true },
    })
    const totalStudents = new Set(enrollments.map(e => e.userId)).size
    const studentIds = enrollments.map(e => e.id)

    // Average attendance (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentAttendance = await prisma.attendance.findMany({
      where: { 
        courseId: { in: courseIds },
        date: { gte: thirtyDaysAgo }
      },
      select: { status: true },
    })
    const totalAttendanceRecords = recentAttendance.length
    const presentRecords = recentAttendance.filter(a => a.status === 'present').length
    const avgAttendance = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
      : 0

    // Assignments graded
    const assignments = await prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true },
    })
    const submissions = await prisma.submission.findMany({
      where: { 
        assignmentId: { in: assignments.map(a => a.id) },
        marks: { not: null }
      },
      select: { 
        marks: true,
        student: { 
          select: { 
            userId: true,
            user: { select: { name: true } }
          }
        }
      },
    })
    const assignmentsGraded = submissions.length

    // Average class performance
    const avgClassPerformance = submissions.length > 0
      ? Math.round(submissions.reduce((sum, s) => sum + (s.marks || 0), 0) / submissions.length)
      : 0

    // Top performer
    const studentScores = new Map<string, { name: string; scores: number[] }>()
    submissions.forEach(s => {
      const userId = s.student.userId
      const name = s.student.user.name
      if (!studentScores.has(userId)) {
        studentScores.set(userId, { name, scores: [] })
      }
      studentScores.get(userId)!.scores.push(s.marks || 0)
    })

    const studentAverages = Array.from(studentScores.entries()).map(([userId, data]) => ({
      userId,
      name: data.name,
      average: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
    }))

    const topPerformer = studentAverages.length > 0
      ? studentAverages.reduce((top, current) => 
          current.average > top.average ? current : top
        )
      : null

    // Students needing improvement
    const improvementNeeded = studentAverages.filter(s => s.average < 60).length

    res.json({
      totalStudents,
      avgAttendance,
      assignmentsGraded,
      avgClassPerformance,
      topPerformer: topPerformer ? {
        name: topPerformer.name,
        score: Math.round(topPerformer.average)
      } : null,
      improvementNeeded
    })
  } catch (err) {
    console.error('[GET /dashboard/teacher/quick-stats]', err)
    res.status(500).json({ message: 'Failed to load quick stats' })
  }
})

// Enhanced Teacher Performance Analytics
router.get('/dashboard/teacher/performance-analytics', authenticateJWT, async (req, res) => {
  try {
    if (req.auth!.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' })

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.auth!.userId },
      select: { id: true, subject: true },
    })
    if (!teacher) return res.json({ 
      marksTrend: [], avgMarks: null, weakStudents: [], attendance: { present: 0, absent: 0, late: 0 },
      subjectPerformance: [], gradeDistribution: [], submissionTrend: []
    })

    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true, name: true },
    })
    const courseIds = courses.map(c => c.id)

    // Get all enrollments for teacher's courses
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { courseId: { in: courseIds } },
      select: { userId: true, courseId: true, id: true },
    })
    const studentIds = enrollments.map(e => e.id)

    // Get all assignments and submissions
    const assignments = await prisma.assignment.findMany({
      where: { courseId: { in: courseIds } },
      select: { id: true, courseId: true, createdAt: true },
    })
    const assignmentIds = assignments.map(a => a.id)

    const submissions = await prisma.submission.findMany({
      where: { assignmentId: { in: assignmentIds } },
      select: { 
        id: true, 
        marks: true, 
        createdAt: true,
        assignmentId: true,
        student: { 
          select: { 
            userId: true, 
            courseId: true,
            user: { select: { name: true } } 
          } 
        } 
      },
    })

    // 1. Marks Trend (last 4 weeks)
    const marksData = submissions.filter(s => s.marks != null)
    const marksTrend = [1,2,3,4].map(w => {
      const weekSubmissions = marksData.slice(
        Math.max(0, marksData.length - w * Math.ceil(marksData.length / 4)),
        marksData.length - (w-1) * Math.ceil(marksData.length / 4)
      )
      const avg = weekSubmissions.length
        ? Math.round(weekSubmissions.reduce((a, s) => a + (s.marks ?? 0), 0) / weekSubmissions.length)
        : 0
      return { label: `Week ${5-w}`, value: avg }
    }).reverse()

    // 2. Average marks
    const avgMarks = marksData.length
      ? Math.round(marksData.reduce((acc, s) => acc + (s.marks ?? 0), 0) / marksData.length)
      : null

    // 3. Weak students
    const studentMarksMap = new Map<string, { name: string; marks: number[] }>()
    for (const s of marksData) {
      const name = s.student.user.name
      const uid = s.student.userId
      if (!studentMarksMap.has(uid)) studentMarksMap.set(uid, { name, marks: [] })
      studentMarksMap.get(uid)!.marks.push(s.marks!)
    }
    const weakStudents = Array.from(studentMarksMap.entries())
      .map(([uid, d]) => ({
        userId: uid,
        name: d.name,
        avg: Math.round(d.marks.reduce((a, b) => a + b, 0) / d.marks.length),
      }))
      .filter(s => s.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 8)

    // 4. Today's attendance
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
    const todayAttendance = await prisma.attendance.findMany({
      where: { courseId: { in: courseIds }, date: { gte: today, lt: tomorrow } },
      select: { status: true },
    })
    const attendance = {
      present: todayAttendance.filter(a => a.status === 'present').length,
      absent: todayAttendance.filter(a => a.status === 'absent').length,
      late: todayAttendance.filter(a => a.status === 'late').length,
    }

    // 5. Subject-wise performance
    const subjectPerformance = courses.map(course => {
      const courseSubmissions = submissions.filter(s => s.student.courseId === course.id && s.marks != null)
      const courseEnrollments = enrollments.filter(e => e.courseId === course.id)
      const avgMarks = courseSubmissions.length
        ? Math.round(courseSubmissions.reduce((a, s) => a + (s.marks ?? 0), 0) / courseSubmissions.length)
        : 0
      return {
        subject: course.name,
        avgMarks,
        totalStudents: courseEnrollments.length
      }
    })

    // 6. Grade distribution
    const getGrade = (marks: number): string => {
      if (marks >= 90) return 'A+'
      if (marks >= 80) return 'A'
      if (marks >= 70) return 'B+'
      if (marks >= 60) return 'B'
      if (marks >= 50) return 'C'
      return 'F'
    }

    const gradeMap = new Map<string, number>()
    marksData.forEach(s => {
      const grade = getGrade(s.marks!)
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + 1)
    })

    const totalGraded = marksData.length
    const gradeDistribution = Array.from(gradeMap.entries()).map(([grade, count]) => ({
      grade,
      count,
      percentage: totalGraded > 0 ? Math.round((count / totalGraded) * 100) : 0
    })).sort((a, b) => {
      const gradeOrder = ['A+', 'A', 'B+', 'B', 'C', 'F']
      return gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade)
    })

    // 7. Submission trends (last 4 weeks)
    const now = new Date()
    const submissionTrend = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      
      const weekAssignments = assignments.filter(a => 
        a.createdAt >= weekStart && a.createdAt < weekEnd
      )
      const weekSubmissions = submissions.filter(s => 
        s.createdAt >= weekStart && s.createdAt < weekEnd
      )
      
      const expectedSubmissions = weekAssignments.length * enrollments.length
      const actualSubmissions = weekSubmissions.length
      const pendingSubmissions = Math.max(0, expectedSubmissions - actualSubmissions)
      
      submissionTrend.push({
        week: `Week ${4-i}`,
        submitted: actualSubmissions,
        pending: pendingSubmissions
      })
    }

    res.json({
      marksTrend,
      avgMarks,
      weakStudents,
      attendance,
      subjectPerformance,
      gradeDistribution,
      submissionTrend
    })
  } catch (err) {
    console.error('[GET /dashboard/teacher/performance-analytics]', err)
    res.status(500).json({ message: 'Failed to load performance analytics' })
  }
})

export default router
