import { supabase } from '@/lib/supabase'

const BASE = 'https://app.opendate.io'

async function getNewToken(): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'password',
      username: process.env.OPENDATE_USERNAME,
      email: process.env.OPENDATE_USERNAME,
      password: process.env.OPENDATE_PASSWORD,
      client_id: process.env.OPENDATE_CLIENT_ID,
      client_secret: process.env.OPENDATE_CLIENT_SECRET,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

async function refreshToken(refresh_token: string): Promise<{ access_token: string; refresh_token: string; expires_in: number } | null> {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token,
      client_id: process.env.OPENDATE_CLIENT_ID,
      client_secret: process.env.OPENDATE_CLIENT_SECRET,
    }),
  })
  if (!res.ok) return null
  return res.json()
}

async function storeTokens(access_token: string, refresh_token: string, expires_in: number) {
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString()
  await supabase.from('opendate_tokens').upsert(
    { id: 1, access_token, refresh_token, expires_at, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  )
}

export async function getValidToken(): Promise<string | null> {
  const { data } = await supabase.from('opendate_tokens').select('*').eq('id', 1).single()

  if (data) {
    // Refresh 5 minutes before expiry
    const needsRefresh = new Date(data.expires_at).getTime() - Date.now() < 5 * 60 * 1000
    if (!needsRefresh) return data.access_token

    const tokens = await refreshToken(data.refresh_token)
    if (tokens?.access_token) {
      await storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in)
      return tokens.access_token
    }
  }

  // No stored token or refresh failed — get a fresh one
  const tokens = await getNewToken()
  if (!tokens?.access_token) return null
  await storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in)
  return tokens.access_token
}

export async function fetchEvents(start: string, end: string): Promise<Record<string, { name: string; url: string }>> {
  const token = await getValidToken()
  if (!token) return {}

  const params = new URLSearchParams({
    'q[starts_at_gteq]': start,
    'q[starts_at_lteq]': end,
    per_page: '100',
  })

  const res = await fetch(`${BASE}/api/v2/confirms?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) return {}

  const data = await res.json()
  const events: Record<string, { name: string; url: string }> = {}
  for (const e of data.collection ?? []) {
    if (e.start_date && e.name) {
      const dateKey = String(e.start_date).slice(0, 10)
      const teamId = e.team_id ?? process.env.OPENDATE_TEAM_ID
      const url = teamId
        ? `${BASE}/teams/${teamId}/confirms/${e.id}`
        : `${BASE}/confirms/${e.id}`
      events[dateKey] = { name: e.name, url }
    }
  }
  return events
}
