import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { textSubClaimed, textSubDeclined, textSubFilled } from '@/lib/sms'

const STOP_WORDS = new Set(['stop', 'cancel', 'end', 'quit', 'unsubscribe'])

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function twiml(message?: string) {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response/>`
  return new NextResponse(body, { headers: { 'Content-Type': 'text/xml' } })
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const from = form.get('From') as string | null
  const body = (form.get('Body') as string | null)?.trim().toLowerCase()

  if (!from || !body) return twiml()

  const isYes = body === 'yes'
  const isNo = body === 'no'
  const isStop = STOP_WORDS.has(body)

  if (!isYes && !isNo && !isStop) return twiml()

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name, sms_opt_in_status')
    .eq('phone', from)
    .eq('active', true)
    .single()

  if (!staff) return twiml()

  if (isStop) {
    await supabase.from('staff').update({ sms_opt_in_status: 'opted_out' }).eq('id', staff.id)
    return twiml()
  }

  if (isYes && staff.sms_opt_in_status === 'pending') {
    await supabase.from('staff').update({ sms_opt_in_status: 'accepted' }).eq('id', staff.id)
    return twiml("You're confirmed! You'll hear from us when your schedule is ready. Reply STOP at any time to opt out.")
  }

  // YES or NO — check sub claims first, then shift confirmations
  if (isYes || isNo) {
    const { data: claim } = await supabase
      .from('sub_claims')
      .select('*')
      .eq('staff_name', staff.name)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .limit(1)
      .single()

    if (claim) {
      const newStatus = isYes ? 'claimed' : 'declined'
      await supabase.from('sub_claims').update({ status: newStatus }).eq('token', claim.token)
      if (isYes) {
        const { data: toExpire } = await supabase
          .from('sub_claims')
          .select('staff_name')
          .eq('date', claim.date)
          .eq('absent_staff_name', claim.absent_staff_name)
          .eq('status', 'pending')
          .neq('token', claim.token)

        await Promise.all([
          supabase
            .from('sub_claims')
            .update({ status: 'expired' })
            .eq('date', claim.date)
            .eq('absent_staff_name', claim.absent_staff_name)
            .eq('status', 'pending')
            .neq('token', claim.token),
          supabase
            .from('assignments')
            .update({ staff_name: claim.staff_name })
            .eq('date', claim.date)
            .eq('staff_name', claim.absent_staff_name),
        ])

        if (toExpire?.length) {
          const names = toExpire.map((c) => c.staff_name)
          const { data: staffRows } = await supabase
            .from('staff')
            .select('name, phone')
            .in('name', names)
            .eq('active', true)
          for (const s of staffRows ?? []) {
            if (s.phone) await textSubFilled(s.phone, s.name, claim.date)
          }
        }
      }
      const adminPhone = process.env.ADMIN_PHONE
      if (adminPhone) {
        if (isYes) await textSubClaimed(adminPhone, claim.staff_name, claim.absent_staff_name, claim.date)
        else await textSubDeclined(adminPhone, claim.staff_name, claim.absent_staff_name, claim.date)
      }
      return isYes
        ? twiml(`Got it — you're covering ${fmtDate(claim.date)}! Thanks.`)
        : twiml(`Got it, thanks for letting us know.`)
    }

    // Fall through to shift confirmation
    const { data: shiftConfirm } = await supabase
      .from('shift_confirmations')
      .select('*')
      .eq('staff_name', staff.name)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .limit(1)
      .single()

    if (shiftConfirm) {
      const newStatus = isYes ? 'confirmed' : 'cancelled'
      await supabase.from('shift_confirmations').update({
        status: newStatus,
        responded_at: new Date().toISOString(),
      }).eq('token', shiftConfirm.token)
      return isYes
        ? twiml(`You're confirmed — see you at Bottlerocket on ${fmtDate(shiftConfirm.date)}!`)
        : twiml(`Got it — we'll find someone else for ${fmtDate(shiftConfirm.date)}.`)
    }

    return twiml("No pending requests found.")
  }
}
