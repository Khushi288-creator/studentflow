const { execSync } = require('child_process')

console.log('🚀 Starting performance data seeding...')

try {
  // Change to backend directory and run the seeder
  process.chdir('./backend')
  execSync('npx tsx src/utils/seedPerformanceData.ts', { stdio: 'inherit' })
  console.log('✅ Performance data seeding completed!')
} catch (error) {
  console.error('❌ Error running seeder:', error.message)
  process.exit(1)
}