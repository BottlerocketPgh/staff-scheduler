import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'

function isAdmin(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value === getExpectedToken()
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  const [year, monthNum] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(year, monthNum, 0).toISOString().split('T')[0]

  const [availRes, staffRes, assignRes, confirmRes, confirmedMonthRes] = await Promise.all([
    supabase.from('availability').select('staff_name, date').gte('date', start).lte('date', end),
    supabase.from('staff').select('name, priority_order, is_new').eq('active', true).order('priority_order'),
    supabase.from('assignments').select('date, staff_name').gte('date', start).lte('date', end),
    supabase.from('shift_confirmations').select('date, status').gte('date', start).lte('date', end),
    supabase.from('confirmed_months').select('month').eq('month', month).maybeSingle(),
  ])

  if (availRes.error || staffRes.error || assignRes.error || confirmRes.error) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const staffMap = new Map(staffRes.data.map((s) => [s.name, s]))
  const assignMap = new Map(assignRes.data.map((a) => [a.date, a.staff_name]))
  const confirmMap = new Map((confirmRes.data ?? []).map((c) => [c.date, c.status as string]))

  const availByDate = new Map<string, typeof staffRes.data>()
  for (const row of availRes.data) {
    const staff = staffMap.get(row.staff_name)
    if (!staff) continue
    if (!availByDate.has(row.date)) availByDate.set(row.date, [])
    availByDate.get(row.date)!.push(staff)
  }
  for (const key of Array.from(availByDate.keys())) {
    const staff = availByDate.get(key)!
    staff.sort(
      (a: { priority_order: number }, b: { priority_order: number }) =>
        a.priority_order - b.priority_order
    )
  }

  const numDays = new Date(year, monthNum, 0).getDate()
  const result: Record<
    string,
    { available: typeof staffRes.data; assigned: string | null; confirmStatus: string | null }
  > = {}

  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`
    result[dateStr] = {
      available: availByDate.get(dateStr) ?? [],
      assigned: assignMap.get(dateStr) ?? null,
      confirmStatus: confirmMap.get(dateStr) ?? null,
    }
  }

  return NextResponse.json({ days: result, confirmed: !!confirmedMonthRes.data })
}
