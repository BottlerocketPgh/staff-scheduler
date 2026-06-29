import { NextResponse } from 'next/server'
import { getValidToken } from '@/lib/opendate'

export async function GET() {
  const token = await getValidToken()
  if (!token) return NextResponse.json({ error: 'No token' })

  const params = new URLSearchParams({
    'q[starts_at_gteq]': '2026-07-01',
    'q[starts_at_lteq]': '2026-07-31',
    per_page: '10',
  })

  const res = await fetch(`https://app.opendate.io/api/v2/confirms?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })

  const data = await res.json()
  const first = data.collection?.[0]
  return NextResponse.json({
    total: data.collection?.length,
    first_event_keys: first ? Object.keys(first) : [],
    sample_events: data.collection?.slice(0, 3),
  })
}
