import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_VERSION = '8.4.1'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify({ apiVersion: API_VERSION, ...data }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sameJson(a: unknown, b: unknown) {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normalize)
    if (v && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, val]) => [k, normalize(val)]))
    }
    return v
  }
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let createdUserId: string | null = null
  let admin: ReturnType<typeof createClient> | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) throw new Error('Nicht angemeldet.')

    admin = createClient(supabaseUrl, serviceKey, {
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
      createdUserId = id

      const { error: profileErr } = await admin.from('kompass_profiles').upsert({
        id,
        display_name: name,
        role,
        active: false,
        coach_teams: coachTeams,
        coaching_groups: coachingGroups,
      }, { onConflict: 'id' })
      if (profileErr) throw new Error('KOMPASS-Profil konnte nicht gespeichert werden: ' + profileErr.message)

      const { error: delErr } = await admin.from('kompass_grade_access').delete().eq('user_id', id)
      if (delErr) throw new Error('Alte Stufenrechte konnten nicht bereinigt werden: ' + delErr.message)

      const rows = Object.entries(gradeAccess)
        .filter(([, level]) => level)
        .map(([grade, level]) => ({ user_id: id, grade: Number(grade), access_level: level }))
      if (rows.length) {
        const { error: accessErr } = await admin.from('kompass_grade_access').insert(rows)
        if (accessErr) throw new Error('Stufenrechte konnten nicht gespeichert werden: ' + accessErr.message)
      }

      // Serverseitige Nachkontrolle. Der Browser muss das neue, zunächst gesperrte Konto nicht lesen können.
      const authResult = await admin.auth.admin.getUserById(id)
      if (authResult.error || !authResult.data.user) {
        throw new Error('Nachkontrolle Auth-Konto fehlgeschlagen: ' + (authResult.error?.message || 'nicht gefunden'))
      }
      const { data: profileCheck, error: profileCheckErr } = await admin
        .from('kompass_profiles')
        .select('id,display_name,role,active,coach_teams,coaching_groups')
        .eq('id', id)
        .single()
      if (profileCheckErr || !profileCheck) {
        throw new Error('Nachkontrolle KOMPASS-Profil fehlgeschlagen: ' + (profileCheckErr?.message || 'nicht gefunden'))
      }
      const { data: accessCheck, error: accessCheckErr } = await admin
        .from('kompass_grade_access')
        .select('grade,access_level')
        .eq('user_id', id)
      if (accessCheckErr) throw new Error('Nachkontrolle Stufenrechte fehlgeschlagen: ' + accessCheckErr.message)

      const expectedAccess = Object.entries(gradeAccess)
        .filter(([, level]) => level)
        .map(([grade, level]) => ({ grade: Number(grade), access_level: level }))
        .sort((a, b) => a.grade - b.grade)
      const actualAccess = (accessCheck || [])
        .map((r: any) => ({ grade: Number(r.grade), access_level: r.access_level }))
        .sort((a: any, b: any) => a.grade - b.grade)

      if (profileCheck.display_name !== name || profileCheck.role !== role || profileCheck.active !== false) {
        throw new Error('Nachkontrolle KOMPASS-Profil stimmt nicht mit den angeforderten Daten überein.')
      }
      if (!sameJson(profileCheck.coach_teams || {}, coachTeams || {})) {
        throw new Error('Nachkontrolle Farbteam stimmt nicht mit den angeforderten Daten überein.')
      }
      if (!sameJson(profileCheck.coaching_groups || {}, coachingGroups || {})) {
        throw new Error('Nachkontrolle Coachinggruppe stimmt nicht mit den angeforderten Daten überein.')
      }
      if (!sameJson(actualAccess, expectedAccess)) {
        throw new Error('Nachkontrolle Stufenrechte stimmt nicht mit den angeforderten Daten überein.')
      }

      createdUserId = null // Ab hier kein Rollback mehr.
      return json({
        user: { id, email: authResult.data.user.email },
        profile: profileCheck,
        gradeAccess: actualAccess,
        verified: true,
      })
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

      const { data: updated, error: updateErr } = await admin
        .from('kompass_profiles')
        .update(patch)
        .eq('id', userId)
        .select('id,display_name,role,active,coach_teams,coaching_groups')
        .single()
      if (updateErr || !updated) throw new Error('Profiländerung fehlgeschlagen: ' + (updateErr?.message || 'Profil nicht gefunden'))

      for (const [key, expected] of Object.entries(patch)) {
        const actual = (updated as Record<string, unknown>)[key]
        if (!sameJson(actual, expected)) throw new Error('Änderung wurde nicht korrekt gespeichert: ' + key)
      }
      return json({ profile: updated, verified: true })
    }

    if (action === 'updateGradeAccess') {
      const userId = String(body.userId || '')
      const grade = Number(body.grade)
      const level = body.level ? String(body.level) : null
      if (!userId || ![5, 6, 7].includes(grade)) throw new Error('Ungültige Benutzer-ID oder Stufe.')
      if (level && !['teacher', 'leitung'].includes(level)) throw new Error('Ungültiges Stufenrecht.')

      if (!level) {
        const { error } = await admin.from('kompass_grade_access').delete().eq('user_id', userId).eq('grade', grade)
        if (error) throw new Error('Stufenrecht konnte nicht entfernt werden: ' + error.message)
      } else {
        const { error } = await admin.from('kompass_grade_access').upsert(
          { user_id: userId, grade, access_level: level },
          { onConflict: 'user_id,grade' },
        )
        if (error) throw new Error('Stufenrecht konnte nicht gespeichert werden: ' + error.message)
      }

      const { data: check, error: checkErr } = await admin
        .from('kompass_grade_access')
        .select('grade,access_level')
        .eq('user_id', userId)
        .eq('grade', grade)
        .maybeSingle()
      if (checkErr) throw new Error('Nachkontrolle Stufenrecht fehlgeschlagen: ' + checkErr.message)
      if (level && (!check || check.access_level !== level)) throw new Error('Stufenrecht konnte nicht bestätigt werden.')
      if (!level && check) throw new Error('Stufenrecht wurde nicht entfernt.')
      return json({ grade, level, verified: true })
    }

    throw new Error('Unbekannte Konto-Aktion: ' + action)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)

    // 8.4.1: Falls die Auth-Anlage bereits geklappt hat, räumen wir EXPLIZIT alle Teile auf.
    // Dadurch bleibt die E-Mail nach einem späteren Fehler nicht mehr blockiert.
    if (createdUserId && admin) {
      const cleanupErrors: string[] = []
      const accessDelete = await admin.from('kompass_grade_access').delete().eq('user_id', createdUserId)
      if (accessDelete.error) cleanupErrors.push('Stufenrechte: ' + accessDelete.error.message)
      const profileDelete = await admin.from('kompass_profiles').delete().eq('id', createdUserId)
      if (profileDelete.error) cleanupErrors.push('Profil: ' + profileDelete.error.message)
      const authDelete = await admin.auth.admin.deleteUser(createdUserId)
      if (authDelete.error) cleanupErrors.push('Auth-Konto: ' + authDelete.error.message)

      if (cleanupErrors.length) {
        return json({
          error: message + ' | Automatische Bereinigung war nicht vollständig: ' + cleanupErrors.join(' / '),
          cleanupComplete: false,
        }, 400)
      }
      return json({ error: message, cleanupComplete: true }, 400)
    }

    return json({ error: message }, 400)
  }
})
