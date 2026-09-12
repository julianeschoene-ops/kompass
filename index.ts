import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) throw new Error('Nicht angemeldet.')

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !authData.user) {
      throw new Error('Anmeldung konnte nicht geprüft werden: ' + (authErr?.message || 'kein Benutzer gefunden'))
    }

    const { data: caller, error: callerErr } = await admin
      .from('kompass_profiles')
      .select('role,active')
      .eq('id', authData.user.id)
      .single()

    if (callerErr) throw new Error('Admin-Profil konnte nicht gelesen werden: ' + callerErr.message)
    if (!caller || caller.role !== 'admin' || caller.active !== true) {
      return json({ error: 'Nur ein aktiver KOMPASS-Admin darf Konten verwalten.' }, 403)
    }

    const body = await req.json()
    const action = String(body.action || 'create')

    if (action === 'create') {
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
          .filter(([, level]) => level)
          .map(([grade, level]) => ({ user_id: id, grade: Number(grade), access_level: level }))
        if (rows.length) {
          const { error: accessErr } = await admin.from('kompass_grade_access').insert(rows)
          if (accessErr) throw accessErr
        }

        // 8.4.0: echte Nachkontrolle, bevor Erfolg gemeldet wird.
        const [{ data: authCheck, error: authCheckErr }, { data: profileCheck, error: profileCheckErr }, { data: accessCheck, error: accessCheckErr }] = await Promise.all([
          admin.auth.admin.getUserById(id),
          admin.from('kompass_profiles').select('id,display_name,role,active,coach_teams,coaching_groups').eq('id', id).single(),
          admin.from('kompass_grade_access').select('grade,access_level').eq('user_id', id),
        ])
        if (authCheckErr || !authCheck.user) throw new Error('Nachkontrolle Auth-Konto fehlgeschlagen: ' + (authCheckErr?.message || 'nicht gefunden'))
        if (profileCheckErr || !profileCheck) throw new Error('Nachkontrolle KOMPASS-Profil fehlgeschlagen: ' + (profileCheckErr?.message || 'nicht gefunden'))
        if (accessCheckErr) throw new Error('Nachkontrolle Stufenrechte fehlgeschlagen: ' + accessCheckErr.message)

        return json({
          user: { id, email: authCheck.user.email },
          profile: profileCheck,
          gradeAccess: accessCheck || [],
          verified: true,
        })
      } catch (e) {
        await admin.auth.admin.deleteUser(id)
        throw e
      }
    }

    if (action === 'updateProfile') {
      const userId = String(body.userId || '')
      if (!userId) throw new Error('Benutzer-ID fehlt.')
      const incoming = body.patch || {}
      const patch: Record<string, unknown> = {}
      if ('role' in incoming) patch.role = incoming.role === 'admin' ? 'admin' : 'teacher'
      if ('active' in incoming) patch.active = Boolean(incoming.active)
      if ('display_name' in incoming) patch.display_name = String(incoming.display_name || '').trim()
      if ('coach_teams' in incoming) patch.coach_teams = incoming.coach_teams || {}
      if ('coaching_groups' in incoming) patch.coaching_groups = incoming.coaching_groups || {}
      if (!Object.keys(patch).length) throw new Error('Keine gültige Profiländerung übergeben.')

      const { error: updateErr } = await admin.from('kompass_profiles').update(patch).eq('id', userId)
      if (updateErr) throw updateErr
      const { data: check, error: checkErr } = await admin
        .from('kompass_profiles')
        .select('id,display_name,role,active,coach_teams,coaching_groups')
        .eq('id', userId)
        .single()
      if (checkErr || !check) throw new Error('Änderung konnte nicht bestätigt werden: ' + (checkErr?.message || 'Profil nicht gefunden'))
      for (const [key, expected] of Object.entries(patch)) {
        const actual = (check as Record<string, unknown>)[key]
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error('Änderung wurde nicht korrekt gespeichert: ' + key)
        }
      }
      return json({ profile: check, verified: true })
    }

    if (action === 'updateGradeAccess') {
      const userId = String(body.userId || '')
      const grade = Number(body.grade)
      const level = body.level ? String(body.level) : null
      if (!userId || ![5, 6, 7].includes(grade)) throw new Error('Ungültige Benutzer-ID oder Stufe.')
      if (level && !['teacher', 'leitung'].includes(level)) throw new Error('Ungültiges Stufenrecht.')

      if (!level) {
        const { error } = await admin.from('kompass_grade_access').delete().eq('user_id', userId).eq('grade', grade)
        if (error) throw error
      } else {
        const { error } = await admin.from('kompass_grade_access').upsert({ user_id: userId, grade, access_level: level }, { onConflict: 'user_id,grade' })
        if (error) throw error
      }

      const { data: check, error: checkErr } = await admin
        .from('kompass_grade_access')
        .select('grade,access_level')
        .eq('user_id', userId)
        .eq('grade', grade)
        .maybeSingle()
      if (checkErr) throw checkErr
      if (level && (!check || check.access_level !== level)) throw new Error('Stufenrecht konnte nicht bestätigt werden.')
      if (!level && check) throw new Error('Stufenrecht wurde nicht entfernt.')
      return json({ grade, level, verified: true })
    }

    throw new Error('Unbekannte Konto-Aktion: ' + action)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400)
  }
})
