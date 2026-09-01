-- Production hardening and Gemini audit metadata.

alter table analyses add column if not exists query text not null default 'What do the latest financial evidence and outlook imply?';
alter table analyses add column if not exists scenario text not null default 'normal';
alter table analyses add column if not exists llm_provider text;
alter table analyses add column if not exists llm_model text;
alter table analyses add column if not exists llm_status text;
alter table analyses add column if not exists llm_grounded boolean not null default false;

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'analyses_user_id_fkey') then
        alter table analyses
            add constraint analyses_user_id_fkey
            foreign key (user_id) references investor_profiles(user_id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'analyses_confidence_check') then
        alter table analyses
            add constraint analyses_confidence_check
            check (overall_confidence >= 0 and overall_confidence <= 1);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'analyses_risk_score_check') then
        alter table analyses
            add constraint analyses_risk_score_check
            check (risk_score >= 0 and risk_score <= 1);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'analyses_scenario_check') then
        alter table analyses
            add constraint analyses_scenario_check
            check (scenario in ('normal', 'degraded_sentiment', 'conflict'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'analyses_llm_status_check') then
        alter table analyses
            add constraint analyses_llm_status_check
            check (llm_status is null or llm_status in ('success', 'unavailable', 'error'));
    end if;
end
$$;

create unique index if not exists agent_results_analysis_agent_uidx
    on agent_results(analysis_id, agent_type);
create unique index if not exists analysis_metrics_analysis_name_uidx
    on analysis_metrics(analysis_id, metric_name);

-- All access goes through the FastAPI backend. Public browser keys must never
-- read investor portfolios or write analysis records directly.
alter table investor_profiles enable row level security;
alter table portfolio_holdings enable row level security;
alter table watchlists enable row level security;
alter table analyses enable row level security;
alter table agent_results enable row level security;
alter table analysis_metrics enable row level security;
alter table evidence enable row level security;

revoke all on table investor_profiles, portfolio_holdings, watchlists, analyses,
    agent_results, analysis_metrics, evidence from anon, authenticated;
grant all on table investor_profiles, portfolio_holdings, watchlists, analyses,
    agent_results, analysis_metrics, evidence to service_role;

-- Keep demo seed data consistent when a migration is reapplied to an existing project.
insert into investor_profiles (user_id, display_name, risk_tolerance, investment_horizon, max_position_size)
values
    ('conservative-demo', 'Conservative Priya', 'conservative', 'long', 15),
    ('aggressive-demo', 'Aggressive Arjun', 'aggressive', 'short', 20)
on conflict (user_id) do update set
    display_name = excluded.display_name,
    risk_tolerance = excluded.risk_tolerance,
    investment_horizon = excluded.investment_horizon,
    max_position_size = excluded.max_position_size,
    updated_at = now();
