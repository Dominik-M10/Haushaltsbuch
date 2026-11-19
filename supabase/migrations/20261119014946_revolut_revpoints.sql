-- Revolut RevPoints als Bonusprogramm ergänzen, wie Amex Membership Rewards.
-- Es ist selbst eine Quelle, deshalb über keine Quelle erreichbar (überall 'nein').

-- 1. Vorbelegung für neue Benutzerkonten, jetzt mit 31 Programmen
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
    (p_user_id, 'Amex Membership Rewards',       'Bonusprogramm', 'nein', null, null, null, false,              'nein', null, null, null, 'nein', null, null),
    (p_user_id, 'Revolut RevPoints',             'Bonusprogramm', 'nein', null, null, null, false,              'nein', null, null, null, 'nein', null, null),
    (p_user_id, 'Payback',                       'Bonusprogramm', 'direkt', 3, 1, null, false,                  'nein', null, null, null, 'nein', null, null)
  on conflict do nothing;
$$;

-- 2. Bestehende Konten bekommen nur dieses eine Programm.
--    Die übrige Vorbelegung läuft nicht noch einmal, damit gelöschte Programme nicht zurückkommen.
insert into public.programme (user_id, name, typ)
select u.id, 'Revolut RevPoints', 'Bonusprogramm'
from auth.users u
where not exists (
  select 1 from public.programme p
  where p.user_id = u.id and lower(p.name) = lower('Revolut RevPoints')
);
