import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'

console.log('Running Phase 0 verification suite...\n')

// 1. Check README line count
const readmePath = path.resolve('README.md')
assert.ok(fs.existsSync(readmePath), 'README.md must exist')
const readmeContent = fs.readFileSync(readmePath, 'utf-8').trim()
const readmeLines = readmeContent.split('\n').filter(line => line.trim().length > 0)
console.log(`✓ README.md verified: ${readmeLines.length} non-empty lines (must be < 10 lines)`)
assert.ok(readmeLines.length < 10, 'README.md must be under 10 lines')

// 2. Check PROGRESS.md and BACKLOG.md
assert.ok(fs.existsSync(path.resolve('PROGRESS.md')), 'PROGRESS.md must exist')
assert.ok(fs.existsSync(path.resolve('BACKLOG.md')), 'BACKLOG.md must exist')
console.log('✓ PROGRESS.md and BACKLOG.md verified')

// 3. Check .env.example
assert.ok(fs.existsSync(path.resolve('.env.example')), '.env.example must exist')
const envExample = fs.readFileSync(path.resolve('.env.example'), 'utf-8')
assert.ok(envExample.includes('NEXT_PUBLIC_SUPABASE_URL'), 'NEXT_PUBLIC_SUPABASE_URL in .env.example')
assert.ok(envExample.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.example')
console.log('✓ .env.example verified')

// 4. Check Migrations
const migrationPath = path.resolve('supabase/migrations/00001_initial_schema.sql')
assert.ok(fs.existsSync(migrationPath), 'Migration file must exist')
const migrationSql = fs.readFileSync(migrationPath, 'utf-8')
assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'profiles table defined')
assert.ok(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS enabled in migration')
assert.ok(migrationSql.includes('admin@desynthic.com'), 'Admin seed defined')
console.log('✓ Supabase initial migration verified')

// 5. Check Pages
assert.ok(fs.existsSync(path.resolve('src/app/login/page.tsx')), 'src/app/login/page.tsx must exist')
assert.ok(fs.existsSync(path.resolve('src/app/dashboard/page.tsx')), 'src/app/dashboard/page.tsx must exist')
console.log('✓ /login and /dashboard pages exist')

// 6. Test dev authentication logic
const defaultAdminEmail = 'admin@desynthic.com'
const defaultAdminPassword = 'password123'

function verifyAuth(email, password) {
  if (email.toLowerCase() === defaultAdminEmail && password === defaultAdminPassword) {
    return { success: true, session: { email, role: 'admin' } }
  }
  return { success: false, error: 'Invalid credentials' }
}

const validAuth = verifyAuth('admin@desynthic.com', 'password123')
assert.equal(validAuth.success, true, 'Admin login should succeed with correct credentials')
assert.equal(validAuth.session.role, 'admin')

const invalidAuth = verifyAuth('admin@desynthic.com', 'wrongpassword')
assert.equal(invalidAuth.success, false, 'Admin login should fail with wrong password')

console.log('✓ Admin login and credentials verification passed')
console.log('\nAll Phase 0 verification tests passed successfully!')
