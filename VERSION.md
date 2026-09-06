# KOMPASS 8.3.7

- Repariert fehlende `kompass_profiles`-Einträge bei neu angelegten Supabase-Konten.
- `UPDATE_8_3_7.sql` installiert den Auth-Trigger neu und legt fehlende Profile für bereits vorhandene Auth-Konten nachträglich an.
- Stufenrechte lassen sich dadurch wieder speichern; der Foreign-Key-Fehler `kompass_grade_access_user_id_fkey` wird behoben.
- Änderungen an Rolle, Freigabe, Farbteam und Coachinggruppe prüfen jetzt, ob tatsächlich ein Profil aktualisiert wurde, und zeigen Fehler sichtbar an.
- „Konten neu laden“ zeigt während des Ladens einen Status.
- Bereits vorhandene E-Mail-Adressen werden beim Anlegen erkannt, statt fälschlich als neues Konto behandelt zu werden.
