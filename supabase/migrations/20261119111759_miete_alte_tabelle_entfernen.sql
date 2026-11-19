-- Die einzelne Miete pro Benutzer ist seit der Migration mietpositionen als Position "Miete" übernommen.
-- Die App nutzt nur noch public.mietpositionen. Die alte Tabelle wurde direkt in der Datenbank gelöscht,
-- diese Datei hält den Schritt im Repository fest ("if exists", damit sie auch auf der bestehenden Datenbank nichts tut).
drop table if exists public.miete;
