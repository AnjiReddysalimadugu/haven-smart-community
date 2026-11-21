# Database backups

SQL dumps of `smart_community` (local PostgreSQL).

- `smart_community-latest.sql` — most recent dump
- `smart_community-YYYYMMDD-HHMMSS.sql` — timestamped copies

Restore example:

```bash
psql -h 127.0.0.1 -p 5432 -U postgres -c "CREATE DATABASE smart_community;"
psql -h 127.0.0.1 -p 5432 -U postgres -d smart_community -f smart_community-latest.sql
```
