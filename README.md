# AI Sales Employee
1. Install dependencies: `npm install`
2. Configure environment: `cp .env.example .env.local`
3. Add Supabase credentials to `.env.local` (or run in dev mode with defaults)
4. Run migration: apply `supabase/migrations/00001_initial_schema.sql` in Supabase
5. Start app: `npm run dev`
6. Log in at `http://localhost:3000/login` with `admin@desynthic.com` / `password123`
