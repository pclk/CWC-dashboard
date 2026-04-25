# CWC Dashboard

Internal operations dashboard for Cadet Wing Commander workflows.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- Neon Postgres
- Auth.js credentials login
- Zod validation

## Environment

Create `.env` from `.env.example` and provide:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `AUTH_SECRET`
- `ADMIN_PASSWORD`
- `ADMIN_AUTH_SECRET` (optional; falls back to `AUTH_SECRET`)

## Local Setup

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

If no users exist, open `/setup` once to create the initial account. After that, sign in at `/login`.
