import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { Pool } from 'pg'

dotenv.config({ path: '.env.local' })

const dir = path.resolve(process.cwd(), 'better-auth_migrations')
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort() : []

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

;(async () => {
  try {
    for (const f of files) {
      const sql = fs.readFileSync(path.join(dir, f), 'utf8')
      console.log('Applying', f)
      await pool.query(sql)
    }
    console.log('All migration files applied successfully')
  } catch (e) {
    console.error('Migration failed:', e.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
})()
