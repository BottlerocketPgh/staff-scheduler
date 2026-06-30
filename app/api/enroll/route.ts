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

  const { data: existing } = await supabase
    .from('staff')
    .select('id, name, phone')
    .ilike('name', name.trim())
    .eq('active', true)
    .single()

  if (existing) {
    if (existing.phone) {
      return NextResponse.json({ error: 'already_registered' }, { status: 409 })
    }
    await supabase
      .from('staff')
      .update({ phone: normalized, sms_opt_in_status: 'pending' })
      .eq('id', existing.id)
    await textOptIn(normalized, existing.name)
    return NextResponse.json({ ok: true, name: existing.name })
  }

  // New staff member
  const { data: maxRow } = await supabase
    .from('staff')
    .select('priority_order')
    .order('priority_order', { ascending: false })
    .limit(1)
    .single()

  const priority_order = (maxRow?.priority_order ?? 0) + 1

  const { error } = await supabase.from('staff').insert({
    name: name.trim(),
    phone: normalized,
    active: true,
    is_new: true,
    priority_order,
    sms_opt_in_status: 'pending',
  })

  if (error) return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })

  await textOptIn(normalized, name.trim())
  return NextResponse.json({ ok: true, name: name.trim() })
}
