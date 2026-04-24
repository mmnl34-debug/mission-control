-- Mission Control: alert_rules tabel + default regels
-- Uit te voeren in Supabase SQL editor (1x)

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('daily_cost','hourly_spike','agent_idle')),
  threshold numeric not null,
  channel text not null default '#orchestrator',
  enabled boolean not null default true,
  cooldown_minutes int not null default 60,
  last_fired_at timestamptz,
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.alert_rules enable row level security;

drop policy if exists "anon_all_alert_rules" on public.alert_rules;
create policy "anon_all_alert_rules" on public.alert_rules
  for all to anon
  using (true)
  with check (true);

-- auto-touch updated_at
create or replace function public.alert_rules_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists alert_rules_touch_updated_at on public.alert_rules;
create trigger alert_rules_touch_updated_at
  before update on public.alert_rules
  for each row execute function public.alert_rules_touch_updated_at();

-- default regels (idempotent dankzij unique name)
insert into public.alert_rules (name, type, threshold, channel, cooldown_minutes) values
  ('Dagelijkse kosten > $5',        'daily_cost',   5, '#orchestrator', 360),
  ('Kostenpiek laatste uur > $2',   'hourly_spike', 2, '#orchestrator', 60),
  ('Agent idle > 30 min',           'agent_idle',  30, '#orchestrator', 60)
on conflict (name) do nothing;
