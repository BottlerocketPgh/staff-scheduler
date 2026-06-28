import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'
import { sendTimeOffRequest } from '@/lib/email'

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
    const { data, error } = await supabase
      .from('time_off_requests')
      .select('*')
      .eq('status', status)
      .order('date')
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

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    await sendTimeOffRequest(adminEmail, staff_name, date, note || null)
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
