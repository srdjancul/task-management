# Task Management

Personal outreach CRM and daily planner. Single user, everything behind
login, dark-only UI built from a Figma token system.

## Features

**Outreach board** — a kanban pipeline for people you're reaching out to.

- Nine stages: To contact → Contacted → Followed up → Replied →
  In conversation → Interview → Won / Rejected / Ghosted
- Drag and drop between and within columns (mouse and touch)
- Every card shows touch count and days since last touch, always derived
  from the touch log — never stored (yellow at 7+ days, red at 14+)
- Contact panel: full touch timeline, log/delete touches, edit, delete
- Quick add with `C`; logging a touch on a *To contact* person moves them
  to *Contacted* automatically

**Daily planner** — Monday to Saturday, three fixed blocks per day:
research 2h, client work 6h, internal projects 2h.

- Start/stop timer per block; starting one stops the running one; elapsed
  time is computed by Postgres functions on the database clock
- Tasks per block plus unattached day tasks
- Week view: actual vs planned per category, per day and in total

All mutations are optimistic — instant UI, revert with a notice on failure.

## Keyboard

Press `?` in the app for the full list. Highlights: `C` new contact,
`/` search, arrows between cards, `Ctrl+arrows` move a card, `Enter`
opens a contact, `T` jumps to the log-touch form.

## Stack

- Next.js 16 (App Router) + TypeScript, `src/` directory, `@/*` alias
- Tailwind CSS v4 — CSS-first config; all design tokens live in
  `src/app/globals.css` (see Conventions in `CLAUDE.md`)
- Radix primitives, restyled to the Figma design system; dnd-kit for drag
- Supabase: Postgres + Auth (email/password), RLS on every table
- Vercel via the GitHub integration

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (`sb_publishable_…`) key |
| `SUPABASE_ACCESS_TOKEN` | CLI only — migrations and type generation |
| `SUPABASE_DB_PASSWORD` | CLI only — migrations |

The first two are also set in Vercel. Auth: create the single user in
Supabase → Authentication → Users, and keep sign-ups disabled.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run lint         # eslint
npm run typecheck    # route typegen + tsc
npm run db:push      # apply supabase/migrations to the linked project
npm run db:types     # regenerate src/lib/supabase/database.types.ts
```

## Database

Schema lives in `supabase/migrations/`. Tables: `contacts`, `touches`,
`time_blocks`, `tasks` — each row is owned via `user_id` and RLS.
`contacts_with_activity` derives touch stats; `start_time_block` /
`stop_time_block` own all timer math. After changing the schema:
`npm run db:push && npm run db:types`.

One migration seeds ten obviously fake contacts ("Test N Contact") the
first time the contacts table is empty — delete them from the app once
real data exists.
