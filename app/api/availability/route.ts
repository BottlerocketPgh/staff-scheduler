import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function monthBounds(month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(year, monthNum, 0).toISOString().split('T')[0]
  return { start, end }
}

// GET /api/availability?name=X&month=YYYY-MM
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  const month = req.nextUrl.searchParams.get('month')
  if (!name || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { start, end } = monthBounds(month)
  const { data, error } = await supabase
    .from('availability')
    .select('date')
    .eq('staff_name', name)
    .gte('date', start)
    .lte('date', end)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.map((r) => r.date))
}

// POST /api/availability  →  add a date
export async function POST(req: NextRequest) {
  const { name, date } = await req.json()
  if (!name || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { error } = await supabase
    .from('availability')
    .upsert({ staff_name: name, date }, { onConflict: 'staff_name,date' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/availability  →  remove a date
export async function DELETE(req: NextRequest) {
  const { name, date } = await req.json()
  if (!name || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { error } = await supabase
    .from('availability')
    .delete()
    .eq('staff_name', name)
    .eq('date', date)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
