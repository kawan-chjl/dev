# Kawan backend — deployment notes

## Supabase connection: session pooler vs transaction pooler

Render outbound traffic is **IPv4**. Supabase's direct connection string is IPv6-only on the free tier,
so you **must** use the Supavisor pooler host (IPv4-reachable).

Two pooler options:

| Mode                      | Port | `KAWAN_DATABASE_URL` prefix       | Note                                                   |
| ------------------------- | ---- | --------------------------------- | ------------------------------------------------------ |
| **Session (recommended)** | 5432 | `postgresql+asyncpg://…@…:5432/…` | No extra connect args needed; safe for single-instance |
| Transaction               | 6543 | `postgresql+asyncpg://…@…:6543/…` | Requires `statement_cache_size=0` (handled in db.py)   |

The code in `app/db.py` passes `{"statement_cache_size": 0, "prepared_statement_cache_size": 0}`
automatically when the URL starts with `postgresql+asyncpg`, covering the transaction pooler.
For the session pooler (5432) those args are harmless but also not required.

Grab the pooler connection string from: Supabase project → Settings → Database → Connection pooling.
Set it in Render as the `KAWAN_DATABASE_URL` secret.
