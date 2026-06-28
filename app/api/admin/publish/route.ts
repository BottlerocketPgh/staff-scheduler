import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'
import { textSchedulePublished } from '@/lib/sms'

function isAdmin(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value === getExpectedToken()
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month } = await req.json()
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  const [year, monthNum] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = new Date(year, monthNum, 0).toISOString().split('T')[0]

  const [assignRes, staffRes] = await Promise.all([
    supabase.from('assignments').select('date, staff_name').gte('date', start).lte('date', end),
    supabase.from('staff').select('name, phone').eq('active', true),
  ])

  const assignments = assignRes.data ?? []

  if (assignments.length === 0) {
    return NextResponse.json({ sent: 0, missing: [], noAssignments: true })
  }

  const byPerson: Record<string, string[]> = {}
  for (const row of assignments) {
    if (!byPerson[row.staff_name]) byPerson[row.staff_name] = []
    byPerson[row.staff_name].push(row.date)
  }

  const phoneMap = new Map((staffRes.data ?? []).map((s) => [s.name, s.phone as string | null]))

  const missing: string[] = []
  let sent = 0

  for (const [name, dates] of Object.entries(byPerson)) {
    const phone = phoneMap.get(name)
    if (!phone) { missing.push(name); continue }
    await textSchedulePublished(phone, name, dates)
    sent++
  }

  return NextResponse.json({ sent, missing })
}
