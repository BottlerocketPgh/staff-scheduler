import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const STOP_WORDS = new Set(['stop', 'cancel', 'end', 'quit', 'unsubscribe'])

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
  const isStop = STOP_WORDS.has(body)

  if (!isYes && !isStop) return twiml()

  const { data: staff } = await supabase
    .from('staff')
    .select('id')
    .eq('phone', from)
    .eq('active', true)
    .single()

  if (!staff) return twiml()

  if (isYes) {
    await supabase.from('staff').update({ sms_opt_in_status: 'accepted' }).eq('id', staff.id)
    return twiml('You\'re confirmed! You\'ll hear from us when your schedule is ready. Reply STOP at any time to opt out.')
  }

  if (isStop) {
    await supabase.from('staff').update({ sms_opt_in_status: 'opted_out' }).eq('id', staff.id)
    return twiml()
  }

  return twiml()
}
