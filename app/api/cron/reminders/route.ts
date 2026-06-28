import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendShiftReminder } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const target = new Date()
  target.setDate(target.getDate() + 2)
  const targetDate = target.toISOString().split('T')[0]

  const { data: assignments } = await supabase
    .from('assignments')
    .select('date, staff_name')
    .eq('date', targetDate)

  if (!assignments?.length) return NextResponse.json({ sent: 0 })

  let sent = 0
  for (const row of assignments) {
    const { data: staff } = await supabase
      .from('staff')
      .select('email')
      .eq('name', row.staff_name)
      .single()

    if (!staff?.email) continue

    const token = randomUUID()

    await supabase.from('shift_confirmations').upsert(
      {
        date: row.date,
        staff_name: row.staff_name,
        token,
        status: 'pending',
        sent_at: new Date().toISOString(),
        responded_at: null,
      },
      { onConflict: 'date' }
    )

    await sendShiftReminder(staff.email, row.staff_name, row.date, token)
    sent++
  }

  return NextResponse.json({ sent, date: targetDate })
}
