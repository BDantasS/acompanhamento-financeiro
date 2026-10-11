-- Finanças da Família: esquema inicial
-- Rode no Supabase (SQL Editor) ou com `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Família (household) e membros
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique
    default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
-- Cada pessoa participa de uma única família.
create unique index household_members_user_idx on public.household_members (user_id);

create or replace function public.is_member(hid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Lançamentos
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  created_at timestamptz not null default now(),
  unique (household_id, kind, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid references auth.users on delete set null,
  kind text not null check (kind in ('expense', 'income')),
  amount numeric(14, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  category_id uuid references public.categories on delete set null,
  payment_method text,
  description text,
  source text not null default 'app' check (source in ('app', 'telegram')),
  created_at timestamptz not null default now()
);
create index transactions_household_date_idx
  on public.transactions (household_id, occurred_on desc);

-- ---------------------------------------------------------------------------
-- Investimentos
-- ---------------------------------------------------------------------------
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  type text not null default 'Outro',
  institution text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.investment_movements (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.investments on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  user_id uuid references auth.users on delete set null,
  kind text not null check (kind in ('deposit', 'withdrawal')),
  amount numeric(14, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index investment_movements_household_idx
  on public.investment_movements (household_id, occurred_on);

-- Saldo real de cada investimento no fim do mês (month = primeiro dia do mês).
create table public.investment_snapshots (
  investment_id uuid not null references public.investments on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  month date not null check (extract(day from month) = 1),
  balance numeric(14, 2) not null check (balance >= 0),
  updated_at timestamptz not null default now(),
  primary key (investment_id, month)
);

-- Meta usada na projeção (uma por família).
create table public.projection_plans (
  household_id uuid primary key references public.households on delete cascade,
  initial_amount numeric(14, 2) not null default 0,
  monthly_contribution numeric(14, 2) not null default 3000,
  monthly_rate numeric(8, 6) not null default 0.015,
  years int not null default 10 check (years between 1 and 60),
  annual_inflation numeric(8, 6) not null default 0,
  start_month date not null default date_trunc('month', current_date)::date,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Telegram
-- ---------------------------------------------------------------------------
create table public.telegram_links (
  telegram_user_id bigint primary key,
  user_id uuid not null references auth.users on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  telegram_name text,
  created_at timestamptz not null default now()
);

create table public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users on delete cascade,
  household_id uuid not null references public.households on delete cascade,
  expires_at timestamptz not null default now() + interval '15 minutes'
);

-- ---------------------------------------------------------------------------
-- Row Level Security: cada família só enxerga os próprios dados
-- ---------------------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.investments enable row level security;
alter table public.investment_movements enable row level security;
alter table public.investment_snapshots enable row level security;
alter table public.projection_plans enable row level security;
alter table public.telegram_links enable row level security;
alter table public.telegram_link_codes enable row level security;

create policy "membros veem a família" on public.households
  for select using (public.is_member(id));
create policy "membros editam a família" on public.households
  for update using (public.is_member(id));

create policy "membros veem membros" on public.household_members
  for select using (public.is_member(household_id));
create policy "membro edita o próprio nome" on public.household_members
  for update using (user_id = auth.uid());

create policy "família" on public.categories
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "família" on public.transactions
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "família" on public.investments
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "família" on public.investment_movements
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "família" on public.investment_snapshots
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "família" on public.projection_plans
  for all using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "próprio vínculo" on public.telegram_links
  for select using (user_id = auth.uid());
create policy "remover próprio vínculo" on public.telegram_links
  for delete using (user_id = auth.uid());
create policy "próprio código" on public.telegram_link_codes
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_member(household_id));

-- ---------------------------------------------------------------------------
-- Criar família / entrar com código de convite
-- ---------------------------------------------------------------------------
create or replace function public.seed_categories(hid uuid)
returns void
language sql security definer set search_path = public
as $$
  insert into categories (household_id, kind, name)
  select hid, 'expense', unnest(array[
    'Mercado', 'Moradia', 'Contas da casa', 'Transporte', 'Saúde', 'Educação',
    'Restaurantes', 'Lazer', 'Compras', 'Assinaturas', 'Filhos', 'Pets', 'Outros'
  ])
  union all
  select hid, 'income', unnest(array[
    'Pró-labore', 'Salário', 'Rendimentos', 'Reembolso', 'Outros'
  ])
  on conflict do nothing;
$$;

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'você já participa de uma família';
  end if;

  insert into households (name) values (p_name) returning id into hid;
  insert into household_members (household_id, user_id, display_name, role)
    values (hid, auth.uid(), p_display_name, 'owner');
  perform seed_categories(hid);
  insert into projection_plans (household_id) values (hid);
  return hid;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  if exists (select 1 from household_members where user_id = auth.uid()) then
    raise exception 'você já participa de uma família';
  end if;

  select id into hid from households where invite_code = upper(trim(p_code));
  if hid is null then
    raise exception 'código de convite inválido';
  end if;

  insert into household_members (household_id, user_id, display_name, role)
    values (hid, auth.uid(), p_display_name, 'member');
  return hid;
end;
$$;

revoke execute on function public.seed_categories(uuid) from public, anon, authenticated;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
