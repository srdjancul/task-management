@AGENTS.md

# Task Management — project conventions

## What this is

A single-user outreach CRM (kanban) + daily planner. Next.js 16 App
Router, TypeScript, Tailwind v4, Supabase (Postgres + Auth), Vercel.
Everything sits behind login; there is exactly one user.

## Design system

- Source of truth: the Figma "Memorisely Design System" tokens,
  transcribed into the `@theme` block of `src/app/globals.css`.
- The app is **dark-only** (owner decision 2026-09-18). Primitives match
  Figma's light documentation; semantic tokens are remapped to dark.
- **Tokens only.** Never a raw hex, px size, or new hue in a component —
  Tailwind's default palette/scales are cleared, so non-token utilities
  simply don't generate. New tokens (widths, scrims) go into `@theme`
  with a comment and need owner approval if they add a hue or typeface.
- Type is Inter, weights ≤ 700; text-first, dense — this is a daily tool,
  not a marketing page.
- shadcn/Radix supply behavior and a11y only; the look comes from tokens.
  Owner rules: "applied" = green badge, "rejected" = red badge.

## Patterns

- Server Components by default; `"use client"` only at interactive leaves
  (board, panel, planner day/week).
- **Optimistic updates, no spinners.** Update state, fire the server
  action, revert + show a short danger notice on failure.
- Touch count / last-touch are **derived** from `touches` (via the
  `contacts_with_activity` view) — never stored on the contact.
- Timer math happens in Postgres (`start_time_block`, `stop_time_block`)
  with the database clock; only one running timer (partial unique index).
- RLS owner-only policies on every table; server actions validate enums
  and required fields before writing.
- Keyboard-first: `C`, `/`, arrows, `Ctrl+arrows`, `Enter`, `T`, `?` —
  new features get shortcuts and an entry in
  `src/components/shortcuts-dialog.tsx`.

## Dependencies

Ask before adding anything beyond shadcn, Radix, Supabase and dnd-kit.

## Commands

```bash
npm run dev / build / lint / typecheck
npm run db:push    # apply migrations (needs SUPABASE_* vars in .env.local)
npm run db:types   # regenerate database.types.ts after schema changes
```

## Workflow

- Migrations are files in `supabase/migrations/`, applied with `db:push`;
  regenerate types in the same change.
- Local dev runs on port 3100 (`npm run dev -- -p 3100`) to stay clear of
  other projects.
- Never commit `.env.local`. Push to `main` only when the owner says so;
  Vercel deploys `main` automatically.
