import { prisma } from '../lib/prisma'

export async function seedPerformanceData() {
  try {
    console.log('🌱 Seeding performance data...')

    // Get existing teacher and students
    const teacher = await prisma.teacher.findFirst({
      include: { user: true }
    })
    
    if (!teacher) {
      console.log('❌ No teacher found. Please create a teacher first.')
      return
    }

    // Get teacher's courses
    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      include: { enrollments: { include: { user: true } } }
    })

    if (courses.length === 0) {
      console.log('❌ No courses found for teacher. Please create courses first.')
      return
    }

    // Create sample assignments for each course
    for (const course of courses) {
      console.log(`📚 Creating assignments for course: ${course.name}`)
      
      const assignments = []
      for (let i = 1; i <= 5; i++) {
        const assignment = await prisma.assignment.create({
          data: {
            title: `Assignment ${i} - ${course.name}`,
            description: `Sample assignment ${i} for performance analytics`,
            courseId: course.id,
            dueDate: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000), // i weeks from now
            createdAt: new Date(Date.now() - (5-i) * 7 * 24 * 60 * 60 * 1000) // created (5-i) weeks ago
          }
        })
        assignments.push(assignment)
      }

      // Create submissions with random marks for each student
      for (const enrollment of course.enrollments) {
        console.log(`👤 Creating submissions for student: ${enrollment.user.name}`)
        
        for (const assignment of assignments) {
          // 80% chance of submission
          if (Math.random() > 0.2) {
            // Generate marks based on student performance level
            const basePerformance = 50 + Math.random() * 40 // 50-90 base range
            const variation = (Math.random() - 0.5) * 20 // ±10 variation
            const marks = Math.max(0, Math.min(100, Math.round(basePerformance + variation)))
            
            await prisma.submission.create({
              data: {
                assignmentId: assignment.id,
                studentId: enrollment.id,
                marks: marks,
                submittedAt: new Date(assignment.createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
                createdAt: new Date(assignment.createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
              }
            })
          }
        }

        // Create attendance records for the last 30 days
        for (let day = 0; day < 30; day++) {
          const date = new Date(Date.now() - day * 24 * 60 * 60 * 1000)
          
          // Skip weekends
          if (date.getDay() === 0 || date.getDay() === 6) continue
          
          // 85% attendance rate
          const status = Math.random() > 0.15 ? 'present' : (Math.random() > 0.5 ? 'absent' : 'late')
          
          await prisma.attendance.create({
            data: {
              studentId: enrollment.id,
              courseId: course.id,
              date: date,
              status: status as any
            }
          })
        }
      }
    }

    console.log('✅ Performance data seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding performance data:', error)
  }
}

// Run if called directly
if (require.main === module) {
  seedPerformanceData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}