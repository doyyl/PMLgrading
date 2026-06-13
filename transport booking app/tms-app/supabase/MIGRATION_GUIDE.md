# Supabase migration guide

These scripts are run **by hand** in the Supabase SQL Editor
(`Dashboard → SQL Editor → New query → paste → Run`). There is no
Supabase CLI / migration table in this project.

## Fresh database (nothing applied yet) — do this

| Step | File | What it does |
|------|------|--------------|
| 1 | `migrations/000_full_setup.sql` | Everything: schema, seed data, login accounts, Supabase Auth, role-based RLS, storage bucket. Anon access stays **open** so you can verify. |
| 2 | *(in SQL Editor)* | Add driver login accounts — see the snippet at the bottom of `000_full_setup.sql`. |
| 3 | *(in the app)* | Log in as `admin / admin1234` and confirm it works. |
| 4 | `migrations/007_lockdown_anon.sql` | Revoke **all** anonymous access. Run only after step 3 succeeds. |

After step 1, verify auth wiring:

```sql
SELECT username, role, auth_uid FROM public.app_users;  -- auth_uid must be non-null
```

Default accounts (change the passwords after first login):

- `admin` / `admin1234`
- `manager` / `manager1234`

## `000_full_setup.sql` replaces the individual files

It is the consolidation of `setup_full.sql` + `migrations/002`–`006`.
You do **not** run those separately. They are kept for history only:

- `002_auth_and_trips.sql` — original app_users + trips (plaintext pw)
- `003_trips_v2.sql` — trips rebuilt on `booking_id`
- `004_booking_extra_cols.sql` — booking wizard columns
- `005_security_login.sql` — bcrypt hashing + `app_login()` RPC
- `006_supabase_auth.sql` — Supabase Auth users + role RLS

Everything those files do is already inside `000_full_setup.sql`.

## Notes

- `000_full_setup.sql` is safe to re-run: it `DROP`s and recreates the
  operational tables but **never drops `app_users`**, so your login
  accounts and their linked auth users survive a re-run.
- `pgcrypto` is created in the `extensions` schema (Supabase convention),
  so password hashing calls are written as `extensions.crypt(...)`.
