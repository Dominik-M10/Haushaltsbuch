-- Miete in einzelne Positionen aufteilen (zum Beispiel Miete, Strom).
-- Jede Position hat einen Gesamtbetrag und meinen Anteil, beides pro Monat.
create table public.mietpositionen (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  bezeichnung   text not null check (length(trim(bezeichnung)) > 0),
  gesamtbetrag  numeric(12,2) not null check (gesamtbetrag >= 0),
  mein_anteil   numeric(12,2) not null check (mein_anteil >= 0),
  erstellt_am   timestamptz not null default now(),
  geaendert_am  timestamptz not null default now(),
  constraint mietpositionen_anteil_nicht_hoeher check (mein_anteil <= gesamtbetrag)
);
create index mietpositionen_user_id on public.mietpositionen (user_id);

-- Rechte und Row Level Security wie bei allen anderen Tabellen
alter table public.mietpositionen enable row level security;
revoke all on table public.mietpositionen from anon, authenticated;
grant select, insert, update, delete on table public.mietpositionen to authenticated;

create policy "Eigene Zeilen lesen" on public.mietpositionen for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Eigene Zeilen anlegen" on public.mietpositionen for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Eigene Zeilen ändern" on public.mietpositionen for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Eigene Zeilen löschen" on public.mietpositionen for delete to authenticated
  using ((select auth.uid()) = user_id);

create trigger setze_geaendert_am before update on public.mietpositionen
  for each row execute function public.setze_geaendert_am();

-- Bisherige Miete als erste Position "Miete" übernehmen
insert into public.mietpositionen (user_id, bezeichnung, gesamtbetrag, mein_anteil, erstellt_am, geaendert_am)
select user_id, 'Miete', gesamtmiete, mein_anteil, erstellt_am, geaendert_am
from public.miete;
