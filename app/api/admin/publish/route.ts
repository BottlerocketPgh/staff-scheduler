import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'
import { sendSchedulePublished } from '@/lib/email'

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

  const { data: assignments } = await supabase
    .from('assignments')
    .select('date, staff_name')
    .gte('date', start)
    .lte('date', end)

  if (!assignments?.length) {
    return NextResponse.json({ sent: 0, missing: [], noAssignments: true })
  }

  const byPerson: Record<string, string[]> = {}
  for (const row of assignments) {
    if (!byPerson[row.staff_name]) byPerson[row.staff_name] = []
    byPerson[row.staff_name].push(row.date)
  }

  const names = Object.keys(byPerson)
  const { data: staffList } = await supabase.from('staff').select('name, email').in('name', names)
  const emailMap = new Map((staffList ?? []).map((s) => [s.name, s.email as string | null]))

  const missing: string[] = []
  let sent = 0

  for (const [name, dates] of Object.entries(byPerson)) {
    const email = emailMap.get(name)
    if (!email) {
      missing.push(name)
      continue
    }
    await sendSchedulePublished(email, name, dates)
    sent++
  }

  return NextResponse.json({ sent, missing })
}
