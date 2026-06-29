import { supabase } from '@/lib/supabase'

const CLIENT_ID = process.env.OPENDATE_CLIENT_ID!
const CLIENT_SECRET = process.env.OPENDATE_CLIENT_SECRET!
const REDIRECT_URI = process.env.OPENDATE_REDIRECT_URI ?? 'https://staff.bottlerocketpgh.com/api/auth/opendate/callback'
const BASE = 'https://app.opendate.io'

export function getAuthUrl(state: string) {
  return `${BASE}/oauth/authorize?${new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state,
  })}`
}

export async function exchangeCode(code: string) {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code,
    }).toString(),
  })
  return res.json()
}

async function doRefresh(refresh_token: string) {
  const res = await fetch(`${BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token,
    }).toString(),
  })
  return res.json()
}

export async function storeTokens(access_token: string, refresh_token: string, expires_in: number) {
  const expires_at = new Date(Date.now() + expires_in * 1000).toISOString()
  await supabase.from('opendate_tokens').upsert(
    { id: 1, access_token, refresh_token, expires_at, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  )
}

export async function getValidToken(): Promise<string | null> {
  const { data } = await supabase.from('opendate_tokens').select('*').eq('id', 1).single()
  if (!data) return null

  // Refresh 5 minutes before expiry
  const needsRefresh = new Date(data.expires_at).getTime() - Date.now() < 5 * 60 * 1000
  if (!needsRefresh) return data.access_token

  const tokens = await doRefresh(data.refresh_token)
  if (tokens.error || !tokens.access_token) return null
  await storeTokens(tokens.access_token, tokens.refresh_token ?? data.refresh_token, tokens.expires_in)
  return tokens.access_token
}

export async function fetchEvents(month: string): Promise<Record<string, string>> {
  const token = await getValidToken()
  if (!token) return {}

  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(y, m, 0).toISOString().split('T')[0]

  // Try known endpoint patterns until one works
  const endpoints = [
    `${BASE}/api/v1/calendar_events?start_date=${start}&end_date=${end}&per_page=100`,
    `${BASE}/api/v1/events?start_date=${start}&end_date=${end}&per_page=100`,
    `${BASE}/api/calendar_events?start_date=${start}&end_date=${end}`,
  ]

  for (const url of endpoints) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) continue
    const data = await res.json()
    const events: Record<string, string> = {}
    const rows = Array.isArray(data) ? data : data.data ?? data.events ?? data.calendar_events ?? []
    for (const e of rows) {
      const date = e.date ?? e.start_date ?? e.starts_at?.slice(0, 10)
      const name = e.name ?? e.title
      if (date && name) events[date] = name
    }
    return events
  }

  return {}
}
