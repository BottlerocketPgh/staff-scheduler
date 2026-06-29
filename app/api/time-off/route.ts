import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'
import { textTimeOffToAdmin, textSubAvailable } from '@/lib/sms'

function isAdmin(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value === getExpectedToken()
}

// GET /api/time-off?name=X&month=YYYY-MM  →  staff's requests for a month
// GET /api/time-off?status=pending         →  admin: all pending requests
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  const month = req.nextUrl.searchParams.get('month')
  const status = req.nextUrl.searchParams.get('status')

  if (status) {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const query = supabase.from('time_off_requests').select('*').order('date')
    const { data, error } = status === 'all' ? await query : await query.eq('status', status)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (name && month) {
    const [year, monthNum] = month.split('-').map(Number)
    const start = `${month}-01`
    const end = new Date(year, monthNum, 0).toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('date, status, note')
      .eq('staff_name', name)
      .gte('date', start)
      .lte('date', end)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Missing params' }, { status: 400 })
}

// POST /api/time-off  →  submit a request
export async function POST(req: NextRequest) {
  const { staff_name, date, note } = await req.json()
  if (!staff_name || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { error } = await supabase
    .from('time_off_requests')
    .upsert({ staff_name, date, note: note || null, status: 'pending' }, { onConflict: 'staff_name,date' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Text admin about the request
  await textTimeOffToAdmin(staff_name, date, note || null)

  // Find other available staff for that date and send each a personalized sub claim link
  const { data: availRows } = await supabase
    .from('availability')
    .select('staff_name')
    .eq('date', date)
    .neq('staff_name', staff_name)

  if (availRows?.length) {
    const names = availRows.map((r) => r.staff_name)
    const { data: staffRows } = await supabase
      .from('staff')
      .select('name, phone')
      .in('name', names)
      .eq('active', true)
    for (const s of staffRows ?? []) {
      if (!s.phone) continue
      const token = crypto.randomUUID()
      await supabase.from('sub_claims').insert({ token, staff_name: s.name, absent_staff_name: staff_name, date })
      await textSubAvailable(s.phone, s.name, staff_name, date, token)
    }
  }

  return NextResponse.json({ ok: true })
}

// PATCH /api/time-off  →  admin approve/deny
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  const { error } = await supabase.from('time_off_requests').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/time-off  →  cancel a request (by staff)
export async function DELETE(req: NextRequest) {
  const { staff_name, date } = await req.json()
  if (!staff_name || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  const { error } = await supabase
    .from('time_off_requests')
    .delete()
    .eq('staff_name', staff_name)
    .eq('date', date)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
