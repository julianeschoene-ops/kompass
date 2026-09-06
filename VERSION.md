# KOMPASS 8.3.6

- Konto-Anlegen repariert: kein Aufruf einer nicht bereitgestellten Edge Function mehr. Neue Konten werden über einen getrennten Supabase-Auth-Client angelegt, sodass die Admin-Sitzung erhalten bleibt.
- Neue Kollegiumskonten bleiben zunächst gesperrt und werden anschließend durch einen Admin freigegeben.
- Zuordnung jetzt dreistufig: Stufe → Farbteam → konkrete Coachinggruppe.
- Bekannte Coachinggruppen der Stufe 6 sind vorausgefüllt (z. B. Blau → Hellblau/Dunkelblau, Violett → Pink/Lila).
- Moritz Stephan: Stufe 6 → Stufenleitung → Blau voreingestellt.
- Neue Profildaten `coaching_groups`; Migration `UPDATE_8_3_6.sql` einmalig in Supabase ausführen.
