import 'dotenv/config'
import bcrypt from 'bcrypt'
import { prisma } from './lib/prisma'

async function main() {
  const email = 'admin@school.com'
  const password = 'admin123'
  const name = 'Admin'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin already exists: ${email}`)
    return
  }

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { name, email, password: hash, role: 'admin' },
  })

  console.log('✅ Admin created successfully')
  console.log(`   Email   : ${email}`)
  console.log(`   Password: ${password}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
