# Edge Function für KOMPASS 8.4.0

Die vollständige Function liegt in:

`supabase/functions/create-kompass-user/index.ts`

Sie ersetzt den bisherigen Code der bereits angelegten Function `create-kompass-user`. Danach **Deploy updates**. Die Einstellung **Verify JWT with legacy secret** bleibt **AUS**.

Die Function übernimmt ab 8.4.0 sowohl das Anlegen als auch alle Änderungen bestehender Kollegiumskonten und bestätigt jede Änderung serverseitig.
