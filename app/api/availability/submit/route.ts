import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'

function isAdmin(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value === getExpectedToken()
}

// GET ?name=X&month=YYYY-MM  →  { submitted: bool }  (staff)
// GET ?month=YYYY-MM          →  [{ staff_name, submitted_at }]  (admin)
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  const month = req.nextUrl.searchParams.get('month')

  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  if (!name) {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data, error } = await supabase
      .from('availability_submissions')
      .select('staff_name, submitted_at')
      .eq('month', month)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data } = await supabase
    .from('availability_submissions')
    .select('submitted_at')
    .eq('staff_name', name)
    .eq('month', month)
    .single()

  return NextResponse.json({ submitted: !!data, submitted_at: data?.submitted_at ?? null })
}

// POST { name, month }  →  lock availability
export async function POST(req: NextRequest) {
  const { name, month } = await req.json()
  if (!name || !month) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { error } = await supabase
    .from('availability_submissions')
    .upsert({ staff_name: name, month }, { onConflict: 'staff_name,month' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE { month }        →  admin: unlock all for month
// DELETE { name, month }  →  admin: unlock one person
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, month } = await req.json()
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  let query = supabase.from('availability_submissions').delete().eq('month', month)
  if (name) query = query.eq('staff_name', name)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
