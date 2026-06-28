import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { textAvailabilityReminder } from '@/lib/sms'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Remind for next month
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const month = next.toISOString().slice(0, 7)

  // All active staff with a phone number
  const { data: allStaff } = await supabase
    .from('staff')
    .select('name, phone')
    .eq('active', true)
    .not('phone', 'is', null)

  if (!allStaff?.length) return NextResponse.json({ sent: 0 })

  // Who has already submitted for next month
  const { data: submitted } = await supabase
    .from('availability_submissions')
    .select('staff_name')
    .eq('month', month)

  const submittedNames = new Set((submitted ?? []).map((r) => r.staff_name))

  const toRemind = allStaff.filter((s) => !submittedNames.has(s.name))

  let sent = 0
  for (const s of toRemind) {
    if (!s.phone) continue
    await textAvailabilityReminder(s.phone, s.name, month)
    sent++
  }

  return NextResponse.json({ sent, month })
}
