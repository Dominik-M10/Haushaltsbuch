-- Einkommen und Sparen können wie Fixkosten monatlich oder jährlich sein (zum Beispiel Weihnachtsgeld).
-- Jährliche Beträge rechnet die App durch 12. Bestehende Einträge bleiben monatlich.
alter table public.einkommen
  add column intervall text not null default 'monatlich' check (intervall in ('monatlich', 'jaehrlich'));

alter table public.sparen
  add column intervall text not null default 'monatlich' check (intervall in ('monatlich', 'jaehrlich'));
