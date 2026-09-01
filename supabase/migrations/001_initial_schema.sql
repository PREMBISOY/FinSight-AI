create extension if not exists pgcrypto;

create table if not exists investor_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id text unique not null,
    display_name text not null,
    risk_tolerance text not null check (risk_tolerance in ('conservative', 'moderate', 'aggressive')),
    investment_horizon text not null check (investment_horizon in ('short', 'medium', 'long')),
    max_position_size numeric not null check (max_position_size > 0 and max_position_size <= 100),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists portfolio_holdings (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references investor_profiles(user_id) on delete cascade,
    symbol text not null,
    quantity numeric not null default 0,
    allocation_percent numeric not null check (allocation_percent >= 0 and allocation_percent <= 100),
    unique (user_id, symbol)
);

create table if not exists watchlists (
    id uuid primary key default gen_random_uuid(),
    user_id text not null references investor_profiles(user_id) on delete cascade,
    symbol text not null,
    unique (user_id, symbol)
);

create table if not exists analyses (
    id uuid primary key,
    user_id text not null,
    symbol text not null,
    overall_classification text not null,
    overall_confidence numeric not null,
    recommendation text not null,
    risk_score numeric not null,
    payload jsonb not null,
    created_at timestamptz not null default now()
);

create table if not exists agent_results (
    id uuid primary key default gen_random_uuid(),
    analysis_id uuid not null references analyses(id) on delete cascade,
    agent_type text not null,
    status text not null,
    classification text not null,
    confidence numeric not null,
    reasoning jsonb not null default '[]'::jsonb,
    signals jsonb not null default '[]'::jsonb,
    evidence jsonb not null default '[]'::jsonb,
    latency_ms numeric not null,
    created_at timestamptz not null default now()
);

create table if not exists analysis_metrics (
    id uuid primary key default gen_random_uuid(),
    analysis_id uuid not null references analyses(id) on delete cascade,
    metric_name text not null,
    metric_value numeric not null,
    unit text not null,
    created_at timestamptz not null default now()
);

create table if not exists evidence (
    id uuid primary key default gen_random_uuid(),
    analysis_id uuid not null references analyses(id) on delete cascade,
    agent_type text not null,
    source_name text not null,
    source_type text not null,
    page integer,
    chunk_id text,
    excerpt text not null,
    relevance_score numeric,
    synthetic boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists analyses_user_created_idx on analyses(user_id, created_at desc);
create index if not exists agent_results_analysis_idx on agent_results(analysis_id);
create index if not exists analysis_metrics_analysis_idx on analysis_metrics(analysis_id);
create index if not exists evidence_analysis_idx on evidence(analysis_id);

-- Demo-only rows. Replace with application-managed users in later sprints.
insert into investor_profiles (user_id, display_name, risk_tolerance, investment_horizon, max_position_size)
values
    ('conservative-demo', 'Conservative Priya', 'conservative', 'long', 15),
    ('aggressive-demo', 'Aggressive Arjun', 'aggressive', 'short', 20)
on conflict (user_id) do nothing;

insert into portfolio_holdings (user_id, symbol, quantity, allocation_percent)
values
    ('conservative-demo', 'RELIANCE', 42, 25),
    ('conservative-demo', 'TCS', 15, 18),
    ('conservative-demo', 'HDFCBANK', 30, 14),
    ('aggressive-demo', 'RELIANCE', 8, 5),
    ('aggressive-demo', 'TCS', 12, 12),
    ('aggressive-demo', 'INFY', 20, 10)
on conflict (user_id, symbol) do nothing;

insert into watchlists (user_id, symbol)
values
    ('conservative-demo', 'RELIANCE'),
    ('conservative-demo', 'TCS'),
    ('conservative-demo', 'HDFCBANK'),
    ('aggressive-demo', 'RELIANCE'),
    ('aggressive-demo', 'TCS'),
    ('aggressive-demo', 'INFY')
on conflict (user_id, symbol) do nothing;
