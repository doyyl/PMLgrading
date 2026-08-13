# AGENTS.md

## Cursor Cloud specific instructions

This repo (a personal `$HOME`-style workspace) contains a few independent projects:

- `transport booking app/tms-app` — **the primary product.** A Vite + React 19 SPA
  (KNS TMS, a transport management system) backed by **Supabase** (Postgres + Auth +
  Storage). This is what "run the app" means.
- `p1/backend` — a trivial Express "hello world" stub (single `GET /` route) on port 3001.
- `Documents/PML1` and `Desktop/learningPython` — standalone Python/pandas data-crunching
  scripts and notebooks (read Excel, compute scores). Not services; run individual files
  with `python <file>.py` if needed. Not part of the app.

Standard scripts live in each project's `package.json` / `README.md`; the notes below are
only the non-obvious bits.

### tms-app — how to run

Scripts (see `transport booking app/tms-app/package.json`): `npm run dev` (Vite, port
**5173**), `npm run build`, `npm run lint`.

The app needs a Supabase backend and two env vars. Despite being a Vite app, the code reads
the **`NEXT_PUBLIC_`**-prefixed vars (legacy from its Next.js origins) — `vite.config.ts`
adds `NEXT_PUBLIC_` to `envPrefix`, so do NOT rename them to `VITE_`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Put them in `transport booking app/tms-app/.env.local` (git-ignored). Point at either a
hosted Supabase project or the local stack described below.

Login (once the schema/seed is applied): `admin` / `admin1234`, `manager` / `manager1234`,
drivers `OP####` / `driver1234` (e.g. `OP5829`). Login tries Supabase Auth first
(`<username>@tms.local`), then an `app_login` RPC, then legacy plaintext.

### Local Supabase backend (dev)

Docker and the `supabase` CLI are pre-installed in the VM image, but nothing is started
automatically. Bring the backend up per session:

1. **Start Docker** (not auto-started): run `sudo dockerd` in a background/tmux session,
   then `sudo chmod 666 /var/run/docker.sock` so the `ubuntu` user can reach it.
2. **Start the stack:** a scratch Supabase project lives at `~/tms-supabase`
   (`cd ~/tms-supabase && supabase start`). API is `http://127.0.0.1:54321`; the local
   **anon key** and DB URL (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`) are
   printed by `supabase start` (they are the standard, stable local demo keys).
3. **Apply the schema/seed** — the repo's SQL under `transport booking app/tms-app/supabase`
   is **hand-run**, not CLI migrations (filenames aren't timestamped; the scratch project's
   `migrations/` is intentionally empty so `supabase start` doesn't auto-apply them in the
   wrong order). On a fresh DB run only these two, in order, via the db container
   (`docker exec -i supabase_db_tms-supabase psql -U postgres -d postgres < <file>`):
   `migrations/000_full_setup.sql` (schema + seed + Auth users + RLS), then
   `migrations/014_fuel_logs.sql`. Do **not** run `002`–`006` (superseded by `000`) or
   `007_lockdown_anon.sql` (revokes anon — only after go-live).
4. **Grant table privileges** — the hand-run SQL relies on hosted Supabase's automatic
   default privileges, which the local stack does not set. After applying the SQL, grant
   them once or REST reads return `permission denied for table ...`:
   ```sql
   GRANT USAGE ON SCHEMA public TO anon, authenticated;
   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
   GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
   GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
   ```
5. Set `.env.local` (step above) to the local URL + anon key.

If the DB volume from a previous session is gone, re-run steps 3–4 (both files are safe to
re-run; `app_users` is preserved).

### Known gotchas

- `npm run lint` reports pre-existing errors: `Definition for rule
  'react-hooks/exhaustive-deps' was not found` (code uses `// eslint-disable-line
  react-hooks/exhaustive-deps` comments but `eslint-plugin-react-hooks` isn't installed or
  registered in `eslint.config.mjs`). These are not caused by env setup. `npm run build`
  is clean.
