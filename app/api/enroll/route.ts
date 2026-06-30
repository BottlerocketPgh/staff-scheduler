import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { textOptIn } from '@/lib/sms'

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json()
  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
  }

  const normalized = normalizePhone(phone)
  if (!normalized) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  const { data: staff } = await supabase
    .from('staff')
    .select('id, name')
    .ilike('name', name.trim())
    .eq('active', true)
    .single()

  if (!staff) {
    return NextResponse.json({ error: 'Name not found' }, { status: 404 })
  }

  await supabase.from('staff').update({ phone: normalized, sms_opt_in_status: 'accepted' }).eq('id', staff.id)
  await textOptIn(normalized, staff.name)

  return NextResponse.json({ ok: true })
}
