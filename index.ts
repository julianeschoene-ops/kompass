import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_VERSION = '8.5.2'
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

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => [key, normalize(val)])
    )
  }
  return value
}

function sameJson(a: unknown, b: unknown) {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b))
}

function accessRows(userId: string, gradeAccess: Record<string, unknown>) {
  return Object.entries(gradeAccess || {})
    .filter(([, level]) => !!level)
    .map(([grade, level]) => ({
      user_id: userId,
      grade: Number(grade),
      access_level: String(level),
    }))
}

async function findAuthUserByEmail(admin: any, email: string) {
  const target = email.trim().toLowerCase()
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error('Bestehende Konten konnten nicht geprüft werden: ' + error.message)
    const users = data?.users || []
    const found = users.find((u: any) => String(u.email || '').trim().toLowerCase() === target)
    if (found) return found
    if (users.length < perPage) return null
    page += 1
    if (page > 50) return null
  }
}

async function readAccountState(admin: any, userId: string) {
  const [{ data: profile, error: profileErr }, { data: access, error: accessErr }] = await Promise.all([
    admin.from('kompass_profiles')
      .select('id,display_name,role,active,coach_teams,coaching_groups')
      .eq('id', userId)
      .maybeSingle(),
    admin.from('kompass_grade_access')
      .select('grade,access_level')
      .eq('user_id', userId),
  ])
  if (profileErr) throw new Error('KOMPASS-Profil konnte nicht gelesen werden: ' + profileErr.message)
  if (accessErr) throw new Error('Stufenrechte konnten nicht gelesen werden: ' + accessErr.message)
  return { profile, access: access || [] }
}

async function writeAccountState(admin: any, args: {
  userId: string
  name: string
  role: string
  active: boolean
  gradeAccess: Record<string, unknown>
  coachTeams: Record<string, unknown>
  coachingGroups: Record<string, unknown>
}) {
  const { userId, name, role, active, gradeAccess, coachTeams, coachingGroups } = args

  const { error: profileErr } = await admin.from('kompass_profiles').upsert({
    id: userId,
    display_name: name,
    role,
    active,
    coach_teams: coachTeams || {},
    coaching_groups: coachingGroups || {},
  }, { onConflict: 'id' })
  if (profileErr) throw new Error('KOMPASS-Profil konnte nicht gespeichert werden: ' + profileErr.message)

  const { error: deleteErr } = await admin.from('kompass_grade_access').delete().eq('user_id', userId)
  if (deleteErr) throw new Error('Stufenrechte konnten nicht aktualisiert werden: ' + deleteErr.message)

  const rows = accessRows(userId, gradeAccess)
  if (rows.length) {
    const { error: accessErr } = await admin.from('kompass_grade_access').insert(rows)
    if (accessErr) throw new Error('Stufenrechte konnten nicht gespeichert werden: ' + accessErr.message)
  }

  const state = await readAccountState(admin, userId)
  if (!state.profile) throw new Error('Nachkontrolle: KOMPASS-Profil fehlt.')

  const expectedAccess = rows
    .map((r: any) => ({ grade: Number(r.grade), access_level: r.access_level }))
    .sort((a: any, b: any) => a.grade - b.grade)
  const actualAccess = (state.access || [])
    .map((r: any) => ({ grade: Number(r.grade), access_level: r.access_level }))
    .sort((a: any, b: any) => a.grade - b.grade)

  if (state.profile.display_name !== name) throw new Error('Nachkontrolle: Name wurde nicht korrekt gespeichert.')
  if (state.profile.role !== role) throw new Error('Nachkontrolle: Rolle wurde nicht korrekt gespeichert.')
  if (state.profile.active !== active) throw new Error('Nachkontrolle: Kontostatus wurde nicht korrekt gespeichert.')
  if (!sameJson(state.profile.coach_teams || {}, coachTeams || {})) throw new Error('Nachkontrolle: Farbteam wurde nicht korrekt gespeichert.')
  if (!sameJson(state.profile.coaching_groups || {}, coachingGroups || {})) throw new Error('Nachkontrolle: Coachinggruppe wurde nicht korrekt gespeichert.')
  if (!sameJson(actualAccess, expectedAccess)) throw new Error('Nachkontrolle: Stufenrechte wurden nicht korrekt gespeichert.')

  return { profile: state.profile, gradeAccess: actualAccess }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let admin: any = null
  let newlyCreatedUserId: string | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Nicht angemeldet.' }, 401)

    admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !authData.user) {
      return json({ error: 'Anmeldung konnte nicht geprüft werden: ' + (authErr?.message || 'kein Benutzer gefunden') }, 401)
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

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || 'ping')

    // Wichtig: Versionsprüfung ist ab 8.5.2 eine eigene, NICHT verändernde Anfrage.
    if (action === 'ping' || action === 'version') {
      return json({ ok: true, verified: true, mutation: false, version: API_VERSION })
    }

    // Kontenliste ausschließlich serverseitig laden. So sieht der Admin auch
    // gesperrte Konten zuverlässig und die zugehörige Auth-E-Mail ist eindeutig sichtbar.
    if (action === 'listAccounts') {
      const [{ data: profiles, error: profilesErr }, { data: access, error: accessErr }] = await Promise.all([
        admin.from('kompass_profiles')
          .select('id,display_name,role,active,coach_teams,coaching_groups,created_at')
          .order('display_name'),
        admin.from('kompass_grade_access')
          .select('user_id,grade,access_level'),
      ])
      if (profilesErr) throw new Error('Kontenliste konnte nicht geladen werden: ' + profilesErr.message)
      if (accessErr) throw new Error('Stufenrechte konnten nicht geladen werden: ' + accessErr.message)

      const authById = new Map<string, any>()
      let page = 1
      const perPage = 200
      for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error) throw new Error('Auth-Konten konnten nicht geladen werden: ' + error.message)
        const users = data?.users || []
        for (const user of users) authById.set(user.id, user)
        if (users.length < perPage) break
        page += 1
        if (page > 50) break
      }

      const accounts = (profiles || []).map((profile: any) => {
        const authUser = authById.get(profile.id)
        const gradeAccess = Object.fromEntries(
          (access || [])
            .filter((row: any) => row.user_id === profile.id)
            .map((row: any) => [String(row.grade), row.access_level])
        )
        return {
          ...profile,
          email: authUser?.email || '',
          gradeAccess,
        }
      })

      return json({ ok: true, verified: true, mutation: false, accounts })
    }

    if (action === 'create') {
      const name = String(body.name || '').trim()
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const role = body.role === 'admin' ? 'admin' : 'teacher'
      const gradeAccess = (body.gradeAccess || {}) as Record<string, unknown>
      const coachTeams = (body.coachTeams || {}) as Record<string, unknown>
      const coachingGroups = (body.coachingGroups || {}) as Record<string, unknown>

      if (!name || !email || !password) throw new Error('Name, E-Mail und Startpasswort fehlen.')
      if (password.length < 6) throw new Error('Das Startpasswort muss mindestens 6 Zeichen lang sein.')

      // Erst nach bestehender E-Mail suchen. Ein liegen gebliebenes, noch gesperrtes Konto wird repariert
      // statt die Anlage mit "E-Mail bereits vergeben" abzubrechen.
      let authUser = await findAuthUserByEmail(admin, email)
      let repairedExisting = false

      if (authUser) {
        const existingState = await readAccountState(admin, authUser.id)
        if (existingState.profile?.active === true) {
          return json({
            error: 'Für diese E-Mail existiert bereits ein aktives KOMPASS-Konto. Bitte das bestehende Konto bearbeiten.',
            code: 'ACCOUNT_ALREADY_ACTIVE',
          }, 409)
        }

        // Nur gesperrte/unvollständige Konten dürfen durch "Konto anlegen" repariert werden.
        const { error: authUpdateErr } = await admin.auth.admin.updateUserById(authUser.id, {
          password,
          email_confirm: true,
          user_metadata: { ...(authUser.user_metadata || {}), display_name: name },
        })
        if (authUpdateErr) throw new Error('Vorhandenes Auth-Konto konnte nicht repariert werden: ' + authUpdateErr.message)
        repairedExisting = true
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: name },
        })
        if (createErr) throw new Error('Auth-Konto konnte nicht angelegt werden: ' + createErr.message)
        authUser = created.user
        if (!authUser?.id) throw new Error('Supabase hat keine Benutzer-ID zurückgegeben.')
        newlyCreatedUserId = authUser.id
      }

      const saved = await writeAccountState(admin, {
        userId: authUser.id,
        name,
        role,
        active: false,
        gradeAccess,
        coachTeams,
        coachingGroups,
      })

      const authCheck = await admin.auth.admin.getUserById(authUser.id)
      if (authCheck.error || !authCheck.data.user) {
        throw new Error('Nachkontrolle: Auth-Konto konnte nicht bestätigt werden: ' + (authCheck.error?.message || 'nicht gefunden'))
      }

      newlyCreatedUserId = null
      return json({
        user: { id: authUser.id, email: authCheck.data.user.email },
        profile: saved.profile,
        gradeAccess: saved.gradeAccess,
        repairedExisting,
        verified: true,
      })
    }

    if (action === 'saveAccount') {
      const userId = String(body.userId || '')
      const name = String(body.name || '').trim()
      const role = body.role === 'admin' ? 'admin' : 'teacher'
      const active = Boolean(body.active)
      const gradeAccess = (body.gradeAccess || {}) as Record<string, unknown>
      const coachTeams = (body.coachTeams || {}) as Record<string, unknown>
      const coachingGroups = (body.coachingGroups || {}) as Record<string, unknown>

      if (!userId || !name) throw new Error('Benutzer-ID oder Name fehlt.')
      if (userId === authData.user.id && (role !== 'admin' || active !== true)) {
        throw new Error('Das aktuell angemeldete Admin-Konto kann sich nicht selbst sperren oder die eigene Adminrolle entfernen.')
      }

      const before = await readAccountState(admin, userId)
      if (!before.profile) throw new Error('Das zu ändernde KOMPASS-Konto wurde nicht gefunden.')

      try {
        const saved = await writeAccountState(admin, {
          userId,
          name,
          role,
          active,
          gradeAccess: role === 'admin' ? {} : gradeAccess,
          coachTeams: role === 'admin' ? {} : coachTeams,
          coachingGroups: role === 'admin' ? {} : coachingGroups,
        })
        return json({ profile: saved.profile, gradeAccess: saved.gradeAccess, verified: true })
      } catch (saveError) {
        // Bestehende Konten werden bei einem Fehler auf den vorherigen Zustand zurückgesetzt.
        try {
          const oldGradeAccess = Object.fromEntries((before.access || []).map((r: any) => [String(r.grade), r.access_level]))
          await writeAccountState(admin, {
            userId,
            name: before.profile.display_name,
            role: before.profile.role,
            active: before.profile.active,
            gradeAccess: oldGradeAccess,
            coachTeams: before.profile.coach_teams || {},
            coachingGroups: before.profile.coaching_groups || {},
          })
        } catch (rollbackError) {
          throw new Error(
            (saveError instanceof Error ? saveError.message : String(saveError)) +
            ' | Rücksetzen auf den vorherigen Stand ist ebenfalls fehlgeschlagen: ' +
            (rollbackError instanceof Error ? rollbackError.message : String(rollbackError))
          )
        }
        throw saveError
      }
    }


    if (action === 'deleteAccount') {
      const userId = String(body.userId || '')
      if (!userId) throw new Error('Benutzer-ID fehlt.')
      if (userId === authData.user.id) {
        return json({ error: 'Das aktuell angemeldete Admin-Konto kann nicht gelöscht werden.' }, 409)
      }

      const authBefore = await admin.auth.admin.getUserById(userId)
      const stateBefore = await readAccountState(admin, userId)
      if (authBefore.error || !authBefore.data.user || !stateBefore.profile) {
        return json({ error: 'Das zu löschende Konto wurde nicht vollständig gefunden. Es wurde nichts gelöscht.' }, 404)
      }

      const accessDelete = await admin.from('kompass_grade_access').delete().eq('user_id', userId)
      if (accessDelete.error) throw new Error('Stufenrechte konnten nicht gelöscht werden: ' + accessDelete.error.message)

      const profileDelete = await admin.from('kompass_profiles').delete().eq('id', userId)
      if (profileDelete.error) throw new Error('KOMPASS-Profil konnte nicht gelöscht werden: ' + profileDelete.error.message)

      const authDelete = await admin.auth.admin.deleteUser(userId)
      if (authDelete.error) {
        // Profil und Rechte wiederherstellen, wenn das Auth-Konto nicht gelöscht werden konnte.
        const oldGradeAccess = Object.fromEntries((stateBefore.access || []).map((r: any) => [String(r.grade), r.access_level]))
        await writeAccountState(admin, {
          userId,
          name: stateBefore.profile.display_name,
          role: stateBefore.profile.role,
          active: stateBefore.profile.active,
          gradeAccess: oldGradeAccess,
          coachTeams: stateBefore.profile.coach_teams || {},
          coachingGroups: stateBefore.profile.coaching_groups || {},
        })
        throw new Error('Auth-Konto konnte nicht gelöscht werden; Profil und Rechte wurden wiederhergestellt: ' + authDelete.error.message)
      }

      const authCheck = await admin.auth.admin.getUserById(userId)
      const profileCheck = await admin.from('kompass_profiles').select('id').eq('id', userId).maybeSingle()
      const accessCheck = await admin.from('kompass_grade_access').select('user_id').eq('user_id', userId)
      if (!authCheck.error || profileCheck.data || (accessCheck.data || []).length) {
        throw new Error('Nachkontrolle: Das Konto wurde nicht vollständig entfernt.')
      }

      return json({ ok: true, verified: true, deleted: true, mutation: true, userId })
    }

    return json({ error: 'Unbekannte Konto-Aktion: ' + action }, 400)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)

    // Nur ein in DIESER Anfrage neu erzeugtes Auth-Konto wird bei Fehlern automatisch entfernt.
    // Bereits vorher vorhandene gesperrte Konten werden nie versehentlich gelöscht.
    if (newlyCreatedUserId && admin) {
      const cleanupErrors: string[] = []
      const accessDelete = await admin.from('kompass_grade_access').delete().eq('user_id', newlyCreatedUserId)
      if (accessDelete.error) cleanupErrors.push('Stufenrechte: ' + accessDelete.error.message)
      const profileDelete = await admin.from('kompass_profiles').delete().eq('id', newlyCreatedUserId)
      if (profileDelete.error) cleanupErrors.push('Profil: ' + profileDelete.error.message)
      const authDelete = await admin.auth.admin.deleteUser(newlyCreatedUserId)
      if (authDelete.error) cleanupErrors.push('Auth-Konto: ' + authDelete.error.message)

      return json({
        error: cleanupErrors.length
          ? message + ' | Automatische Bereinigung war nicht vollständig: ' + cleanupErrors.join(' / ')
          : message,
        cleanupComplete: cleanupErrors.length === 0,
      }, 400)
    }

    return json({ error: message }, 400)
  }
})
