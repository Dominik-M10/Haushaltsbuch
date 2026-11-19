-- Mehrere Meilenziele pro Programm, jeweils optional mit Strecke (von, nach) und Art (One way oder Hin und zurück).
-- Pflicht bleibt nur der Zielstand, also die benötigten Meilen oder Punkte.
alter table public.meilenziele drop constraint meilenziele_ein_ziel_pro_programm;
create index meilenziele_programm on public.meilenziele (programm_id, user_id);

alter table public.meilenziele
  add column von  text check (von is null or length(trim(von)) > 0),
  add column nach text check (nach is null or length(trim(nach)) > 0),
  add column art  text check (art is null or art in ('one_way', 'hin_und_zurueck'));
