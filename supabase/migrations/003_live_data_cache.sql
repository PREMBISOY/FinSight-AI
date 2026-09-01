-- Server-only TTL snapshots for live market, news, and financial-statement data.

create table if not exists data_snapshots (
    id uuid primary key default gen_random_uuid(),
    symbol text not null,
    data_type text not null,
    provider text not null,
    payload jsonb not null,
    fetched_at timestamptz not null default now(),
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint data_snapshots_symbol_type_unique unique (symbol, data_type),
    constraint data_snapshots_type_check
        check (data_type in ('market', 'news', 'fundamentals'))
);

create index if not exists data_snapshots_expires_at_idx
    on data_snapshots(expires_at);

alter table data_snapshots enable row level security;
revoke all on table data_snapshots from anon, authenticated;
grant all on table data_snapshots to service_role;
