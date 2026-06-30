import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { textSubClaimed, textSubDeclined } from '@/lib/sms'

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

  // YES or NO for sub coverage
  if (isYes || isNo) {
    const { data: claim } = await supabase
      .from('sub_claims')
      .select('*')
      .eq('staff_name', staff.name)
      .eq('status', 'pending')
      .order('date', { ascending: true })
      .limit(1)
      .single()

    if (!claim) return twiml("No pending sub requests found.")

    const newStatus = isYes ? 'claimed' : 'declined'
    await supabase.from('sub_claims').update({ status: newStatus }).eq('token', claim.token)

    const adminPhone = process.env.ADMIN_PHONE
    if (adminPhone) {
      if (isYes) await textSubClaimed(adminPhone, claim.staff_name, claim.absent_staff_name, claim.date)
      else await textSubDeclined(adminPhone, claim.staff_name, claim.absent_staff_name, claim.date)
    }

    return isYes
      ? twiml(`Got it — you're covering ${fmtDate(claim.date)}! Thanks.`)
      : twiml(`Got it, thanks for letting us know.`)
  }

  return twiml()
}
