-- =====================================================================
-- Haushaltsbuch: Datenmodell
-- Tabellen, Row Level Security, Trigger und Vorbelegung der Programme.
-- Jeder Benutzer sieht und ändert nur seine eigenen Zeilen.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Hilfsfunktion: setzt geaendert_am bei jeder Änderung einer Zeile
-- ---------------------------------------------------------------------
create or replace function public.setze_geaendert_am()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.geaendert_am := now();
  return new;
end;
$$;


-- =====================================================================
-- Haushaltsbuch (fester Monatsplan, alle Beträge in Euro)
-- =====================================================================

-- Einkommen, Betrag pro Monat
create table public.einkommen (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bezeichnung   text not null check (length(trim(bezeichnung)) > 0),
  betrag        numeric(12,2) not null check (betrag >= 0),
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now()
);
create index einkommen_user_id on public.einkommen (user_id);

-- Fixkosten, monatlich oder jährlich (jährlich rechnet die App durch 12)
create table public.fixkosten (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bezeichnung   text not null check (length(trim(bezeichnung)) > 0),
  betrag        numeric(12,2) not null check (betrag >= 0),
  intervall     text not null default 'monatlich' check (intervall in ('monatlich', 'jaehrlich')),
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now()
);
create index fixkosten_user_id on public.fixkosten (user_id);

-- Sparen, Betrag pro Monat
create table public.sparen (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bezeichnung   text not null check (length(trim(bezeichnung)) > 0),
  betrag        numeric(12,2) not null check (betrag >= 0),
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now()
);
create index sparen_user_id on public.sparen (user_id);

-- Miete, genau eine Zeile pro Benutzer, mein Anteil als Betrag in Euro
create table public.miete (
  user_id       uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  gesamtmiete   numeric(12,2) not null default 0 check (gesamtmiete >= 0),
  mein_anteil   numeric(12,2) not null default 0 check (mein_anteil >= 0),
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now(),
  constraint anteil_nicht_hoeher_als_gesamtmiete check (mein_anteil <= gesamtmiete)
);

-- Sparziele
create table public.sparziele (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  zielbetrag      numeric(12,2) not null check (zielbetrag > 0),
  bisher_gespart  numeric(12,2) not null default 0 check (bisher_gespart >= 0),
  erstellt_am     timestamptz not null default now(),
  geaendert_am    timestamptz not null default now()
);
create index sparziele_user_id on public.sparziele (user_id);


-- =====================================================================
-- Meilenstand
-- =====================================================================

-- Programme mit Zuordnung zu den Quellen und Transferverhältnissen.
-- Verhältnis immer Quelle zu Ziel: quelle 5, ziel 4 heißt 5 Punkte ergeben 4 Meilen.
create table public.programme (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                text not null check (length(trim(name)) > 0),
  typ                 text not null check (typ in ('Airline', 'Hotel', 'Bonusprogramm')),

  amex                text not null default 'nein' check (amex in ('nein', 'direkt', 'indirekt')),
  amex_quelle         integer check (amex_quelle > 0),
  amex_ziel           integer check (amex_ziel > 0),
  amex_hinweis        text,
  amex_ueber_payback  boolean not null default false,

  revolut             text not null default 'nein' check (revolut in ('nein', 'direkt', 'indirekt')),
  revolut_quelle      integer check (revolut_quelle > 0),
  revolut_ziel        integer check (revolut_ziel > 0),
  revolut_hinweis     text,

  payback             text not null default 'nein' check (payback in ('nein', 'direkt')),
  payback_quelle      integer check (payback_quelle > 0),
  payback_ziel        integer check (payback_ziel > 0),

  erstellt_am         timestamptz not null default now(),
  geaendert_am        timestamptz not null default now(),

  -- nötig, damit Zwischenstände und Ziele nur auf eigene Programme zeigen können
  constraint programme_id_user_id unique (id, user_id),

  -- Amex: bei "nein" kein Verhältnis. Über Payback: kein eigenes Verhältnis,
  -- die App rechnet in zwei Schritten (Amex zu Payback, dann Payback zum Programm).
  -- Sonst ist das Verhältnis Pflicht.
  constraint amex_regeln check (
    case
      when amex = 'nein' then amex_quelle is null and amex_ziel is null and not amex_ueber_payback
      when amex_ueber_payback then amex = 'indirekt' and payback = 'direkt'
                                   and amex_quelle is null and amex_ziel is null
      else amex_quelle is not null and amex_ziel is not null
    end
  ),
  constraint revolut_regeln check (
    case
      when revolut = 'nein' then revolut_quelle is null and revolut_ziel is null
      else revolut_quelle is not null and revolut_ziel is not null
    end
  ),
  constraint payback_regeln check (
    case
      when payback = 'nein' then payback_quelle is null and payback_ziel is null
      else payback_quelle is not null and payback_ziel is not null
    end
  )
);
-- jeder Programmname nur einmal pro Benutzer, Groß und Kleinschreibung egal
create unique index programme_name_eindeutig on public.programme (user_id, lower(name));

-- Zwischenstände pro Programm
create table public.meilenstaende (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  programm_id   uuid not null,
  datum         date not null default (now() at time zone 'Europe/Berlin')::date,
  stand         bigint not null check (stand >= 0),
  notiz         text,
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now(),
  constraint meilenstaende_programm foreign key (programm_id, user_id)
    references public.programme (id, user_id) on delete cascade
);
create index meilenstaende_programm_datum on public.meilenstaende (programm_id, user_id, datum);
create index meilenstaende_zuletzt_geaendert on public.meilenstaende (user_id, geaendert_am desc);

-- Meilenziel, höchstens eines pro Programm
create table public.meilenziele (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  programm_id   uuid not null,
  zielstand     bigint not null check (zielstand > 0),
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now(),
  constraint meilenziele_ein_ziel_pro_programm unique (programm_id, user_id),
  constraint meilenziele_programm foreign key (programm_id, user_id)
    references public.programme (id, user_id) on delete cascade
);
create index meilenziele_user_id on public.meilenziele (user_id);


-- =====================================================================
-- Rechte, Row Level Security und Änderungstrigger für alle Tabellen
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'einkommen', 'fixkosten', 'sparen', 'miete', 'sparziele',
    'programme', 'meilenstaende', 'meilenziele'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    -- anonyme Zugriffe bekommen nichts, angemeldete nur Lesen und Schreiben
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);

    execute format(
      'create policy "Eigene Zeilen lesen" on public.%I for select to authenticated
         using ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Eigene Zeilen anlegen" on public.%I for insert to authenticated
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Eigene Zeilen ändern" on public.%I for update to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
    execute format(
      'create policy "Eigene Zeilen löschen" on public.%I for delete to authenticated
         using ((select auth.uid()) = user_id)', t);

    execute format(
      'create trigger setze_geaendert_am before update on public.%I
         for each row execute function public.setze_geaendert_am()', t);
  end loop;
end;
$$;


-- =====================================================================
-- Vorbelegung der Programme (Transferverhältnisse Stand 18.11.2026)
-- Wird für jedes neue Benutzerkonto automatisch ausgeführt.
-- =====================================================================
create or replace function public.programme_vorbelegen(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.programme (
    user_id, name, typ,
    amex, amex_quelle, amex_ziel, amex_hinweis, amex_ueber_payback,
    revolut, revolut_quelle, revolut_ziel, revolut_hinweis,
    payback, payback_quelle, payback_ziel
  )
  values
    -- Airlines bei beiden direkt
    (p_user_id, 'Air France/KLM Flying Blue',    'Airline', 'direkt', 5, 4, null, false,                        'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'British Airways Club',          'Airline', 'direkt', 5, 4, null, false,                        'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Emirates Skywards',             'Airline', 'direkt', 2, 1, null, false,                        'direkt', 2, 1, null, 'nein', null, null),
    (p_user_id, 'Iberia Club',                   'Airline', 'direkt', 5, 4, null, false,                        'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Qatar Airways Privilege Club',  'Airline', 'direkt', 3, 2, 'zusätzlich über Avios 5:4', false, 'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'SAS EuroBonus',                 'Airline', 'direkt', 5, 4, null, false,                        'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Singapore Airlines KrisFlyer',  'Airline', 'direkt', 3, 2, null, false,                        'direkt', 2, 1, null, 'nein', null, null),
    -- Airlines nur Amex direkt
    (p_user_id, 'Cathay Pacific Asia Miles',     'Airline', 'direkt', 3, 2, null, false,                        'nein', null, null, null, 'nein', null, null),
    (p_user_id, 'Delta SkyMiles',                'Airline', 'direkt', 3, 2, null, false,                        'nein', null, null, null, 'nein', null, null),
    -- Airlines nur Revolut direkt
    (p_user_id, 'Aegean Miles+Bonus',            'Airline', 'nein', null, null, null, false,                    'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Avianca LifeMiles',             'Airline', 'nein', null, null, null, false,                    'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'China Southern Sky Pearl Club', 'Airline', 'nein', null, null, null, false,                    'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Etihad Guest',                  'Airline', 'nein', null, null, null, false,                    'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Icelandair Saga Club',          'Airline', 'nein', null, null, null, false,                    'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Japan Airlines Mileage Bank',   'Airline', 'nein', null, null, null, false,                    'direkt', 3, 2, null, 'nein', null, null),
    (p_user_id, 'TAP Miles&Go',                  'Airline', 'nein', null, null, null, false,                    'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Turkish Airlines Miles&Smiles', 'Airline', 'nein', null, null, null, false,                    'direkt', 1, 1, null, 'nein', null, null),
    -- Airlines über Avios
    (p_user_id, 'Aer Lingus AerClub',            'Airline', 'indirekt', 5, 4, 'über Avios', false,              'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Finnair Plus',                  'Airline', 'indirekt', 5, 4, 'über Avios', false,              'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Vueling Club',                  'Airline', 'indirekt', 5, 4, 'über Avios', false,              'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Loganair Loyalty',              'Airline', 'indirekt', 5, 4, 'über Avios', false,              'indirekt', 1, 1, 'über Avios', 'nein', null, null),
    -- Miles & More: Amex über Payback in zwei Schritten, Payback direkt 1:1
    (p_user_id, 'Miles & More',                  'Airline', 'indirekt', null, null, 'über Payback', true,       'nein', null, null, null, 'direkt', 1, 1),
    -- Hotels bei beiden direkt
    (p_user_id, 'ALL Accor',                     'Hotel', 'direkt', 3, 1, null, false,                          'direkt', 2, 1, null, 'nein', null, null),
    (p_user_id, 'Hilton Honors',                 'Hotel', 'direkt', 1, 1, null, false,                          'direkt', 1, 1, null, 'nein', null, null),
    (p_user_id, 'Radisson Rewards',              'Hotel', 'direkt', 1, 2, null, false,                          'direkt', 1, 3, null, 'nein', null, null),
    -- Hotels nur Amex direkt
    (p_user_id, 'Marriott Bonvoy',               'Hotel', 'direkt', 3, 2, null, false,                          'nein', null, null, null, 'nein', null, null),
    -- Hotels nur Revolut direkt
    (p_user_id, 'I Prefer Hotel Rewards',        'Hotel', 'nein', null, null, null, false,                      'direkt', 1, 2, null, 'nein', null, null),
    (p_user_id, 'Wyndham Rewards',               'Hotel', 'nein', null, null, null, false,                      'direkt', 1, 1, null, 'nein', null, null),
    -- Bonusprogramm
    (p_user_id, 'Payback',                       'Bonusprogramm', 'direkt', 3, 1, null, false,                  'nein', null, null, null, 'nein', null, null)
  on conflict do nothing;
$$;

-- Trigger: legt für jedes neue Benutzerkonto die Programmliste an
create or replace function public.neuer_benutzer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.programme_vorbelegen(new.id);
  return new;
end;
$$;

create trigger neuer_benutzer_programme
  after insert on auth.users
  for each row execute function public.neuer_benutzer();

-- Die Funktionen sind nur für die Datenbank selbst gedacht, nicht über die App aufrufbar
revoke all on function public.setze_geaendert_am()          from public, anon, authenticated;
revoke all on function public.programme_vorbelegen(uuid)    from public, anon, authenticated;
revoke all on function public.neuer_benutzer()              from public, anon, authenticated;

-- Falls schon Benutzerkonten existieren, bekommen sie die Liste ebenfalls
select public.programme_vorbelegen(id) from auth.users;
