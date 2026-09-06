# Edge Function für KOMPASS 8.3.8

Neue Kollegiumskonten werden ab 8.3.8 über die Supabase Edge Function `create-kompass-user` angelegt. Das ist nötig, damit der Admin angemeldet bleibt und Supabase keine Bestätigungs-E-Mails verschickt bzw. kein E-Mail-Rate-Limit auslöst.

Die fertige Function liegt in:
`supabase/functions/create-kompass-user/index.ts`

Nach dem Deploy muss die Function exakt `create-kompass-user` heißen. Die Standard-Secrets `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` werden von Supabase Edge Functions bereitgestellt und dürfen niemals in GitHub oder im Browsercode stehen.
