import dotenv from 'dotenv'
import path from 'path'

// ⚠️ dotenv MUST be loaded before any other imports that use process.env
dotenv.config({ path: path.join(__dirname, '..', '.env') })

import { app } from './app'

const port = process.env.PORT ? Number(process.env.PORT) : 4000

app.listen(port, () => {
  console.log(`[server] running on http://localhost:${port}`)
})
