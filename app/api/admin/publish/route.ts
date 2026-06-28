import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'
import { sendFullSchedule } from '@/lib/email'

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
    supabase.from('staff').select('name, email').eq('active', true),
  ])

  const assignments = assignRes.data ?? []

  if (assignments.length === 0) {
    return NextResponse.json({ sent: 0, missing: [], noAssignments: true })
  }

  const missing: string[] = []
  let sent = 0

  for (const staffMember of staffRes.data ?? []) {
    if (!staffMember.email) {
      missing.push(staffMember.name)
      continue
    }
    await sendFullSchedule(staffMember.email, staffMember.name, month, assignments)
    sent++
  }

  return NextResponse.json({ sent, missing })
}
