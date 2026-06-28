import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'

function isAdmin(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value === getExpectedToken()
}

function monthBounds(month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  return {
    start: `${month}-01`,
    end: new Date(year, monthNum, 0).toISOString().split('T')[0],
  }
}

// GET /api/assignments?month=YYYY-MM
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  const { start, end } = monthBounds(month)
  const { data, error } = await supabase
    .from('assignments')
    .select('date, staff_name')
    .gte('date', start)
    .lte('date', end)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/assignments  →  assign (or pass staff_name: null to unassign)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, staff_name } = await req.json()
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  if (!staff_name) {
    await supabase.from('assignments').delete().eq('date', date)
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('assignments')
    .upsert({ date, staff_name }, { onConflict: 'date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
