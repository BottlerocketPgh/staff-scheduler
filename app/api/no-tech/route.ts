import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'

function isAdmin(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value === getExpectedToken()
}

// GET ?month=YYYY-MM → array of no-tech date strings
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const { data, error } = await supabase
    .from('no_tech_dates')
    .select('date')
    .gte('date', `${month}-01`)
    .lte('date', `${month}-${String(lastDay).padStart(2, '0')}`)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map((r) => r.date))
}

// POST { date } → mark date as no tech needed
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { date } = await req.json()
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const { error } = await supabase.from('no_tech_dates').upsert({ date }, { onConflict: 'date' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE { date } → unmark
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { date } = await req.json()
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const { error } = await supabase.from('no_tech_dates').delete().eq('date', date)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
