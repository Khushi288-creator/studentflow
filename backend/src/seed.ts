import 'dotenv/config'
import bcrypt from 'bcrypt'
import { prisma } from './lib/prisma'

async function main() {
  console.log('🌱 Setting up admin account...')

  const email = 'admin@school.com'
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log('ℹ️  Admin already exists:', email)
    console.log('\n📋 Login:')
    console.log('   Admin → admin@school.com / admin123')
    return
  }

  const hash = await bcrypt.hash('admin123', 12)
  await prisma.user.create({
    data: {
      name: 'Admin',
      email,
      password: hash,
      role: 'admin',
      uniqueId: 'ADM001',
    },
  })

  console.log('✅ Admin created')
  console.log('\n📋 Login:')
  console.log('   Admin → admin@school.com / admin123')
  console.log('\n👉 Ab admin se login karke students, teachers, parents create karo.')
  console.log('   Vo sab real data Prisma me store hoga.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
