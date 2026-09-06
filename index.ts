import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) throw new Error('Nicht angemeldet.')

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !authData.user) throw new Error('Anmeldung konnte nicht geprüft werden.')

    const { data: caller, error: callerErr } = await admin.from('kompass_profiles')
      .select('role,active').eq('id', authData.user.id).single()
    if (callerErr || !caller || caller.role !== 'admin' || caller.active !== true) throw new Error('Nur ein aktiver KOMPASS-Admin darf Konten anlegen.')

    const body = await req.json()
    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const role = body.role === 'admin' ? 'admin' : 'teacher'
    const gradeAccess = body.gradeAccess || {}
    const coachTeams = body.coachTeams || {}
    const coachingGroups = body.coachingGroups || {}
    if (!name || !email || !password) throw new Error('Name, E-Mail und Startpasswort fehlen.')
    if (password.length < 6) throw new Error('Das Startpasswort muss mindestens 6 Zeichen lang sein.')

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    })
    if (createErr) throw new Error(createErr.message)
    const id = created.user?.id
    if (!id) throw new Error('Supabase hat keine Benutzer-ID zurückgegeben.')

    try {
      const { error: profileErr } = await admin.from('kompass_profiles').upsert({
        id,
        display_name: name,
        role,
        active: false,
        coach_teams: coachTeams,
        coaching_groups: coachingGroups,
      }, { onConflict: 'id' })
      if (profileErr) throw profileErr

      const { error: delErr } = await admin.from('kompass_grade_access').delete().eq('user_id', id)
      if (delErr) throw delErr
      const rows = Object.entries(gradeAccess)
        .filter(([,level]) => level)
        .map(([grade,level]) => ({ user_id: id, grade: Number(grade), access_level: level }))
      if (rows.length) {
        const { error: accessErr } = await admin.from('kompass_grade_access').insert(rows)
        if (accessErr) throw accessErr
      }
    } catch (e) {
      await admin.auth.admin.deleteUser(id)
      throw e
    }

    return new Response(JSON.stringify({ user: { id, email } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
