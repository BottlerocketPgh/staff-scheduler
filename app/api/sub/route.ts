import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { textSubClaimed, textSubDeclined } from '@/lib/sms'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  const { data } = await supabase.from('sub_claims').select('staff_name, date, status').eq('token', token).single()
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { token, action } = await req.json()
  if (!token || !action) return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  if (action !== 'claim' && action !== 'decline') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const { data: claim } = await supabase
    .from('sub_claims')
    .select('*')
    .eq('token', token)
    .single()

  if (!claim) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (claim.status !== 'pending') return NextResponse.json({ already: true, status: claim.status })

  const newStatus = action === 'claim' ? 'claimed' : 'declined'
  await supabase.from('sub_claims').update({ status: newStatus }).eq('token', token)

  const adminPhone = process.env.ADMIN_PHONE
  if (adminPhone) {
    if (action === 'claim') {
      await textSubClaimed(adminPhone, claim.staff_name, claim.absent_staff_name, claim.date)
    } else {
      await textSubDeclined(adminPhone, claim.staff_name, claim.absent_staff_name, claim.date)
    }
  }

  return NextResponse.json({ ok: true, action, staffName: claim.staff_name, date: claim.date })
}
