import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'
import { textOptIn } from '@/lib/sms'

function isAdmin(req: NextRequest) {
  return req.cookies.get(COOKIE_NAME)?.value === getExpectedToken()
}

// GET /api/staff?q=search  →  autocomplete (name list)
// GET /api/staff            →  full list with priority (admin only)
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')

  if (q !== null) {
    const { data, error } = await supabase
      .from('staff')
      .select('name')
      .ilike('name', `%${q}%`)
      .eq('active', true)
      .order('priority_order')
      .limit(8)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data.map((s) => s.name))
  }

  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('active', true)
    .order('priority_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/staff  →  ensure staff member exists, return canonical record
export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const trimmed = name.trim()

  // Return existing record (case-insensitive match)
  const { data: existing } = await supabase
    .from('staff')
    .select('*')
    .ilike('name', trimmed)
    .single()
  if (existing) return NextResponse.json(existing)

  // New person — assign lowest priority
  const { data: maxRow } = await supabase
    .from('staff')
    .select('priority_order')
    .order('priority_order', { ascending: false })
    .limit(1)
    .single()

  const nextPriority = (maxRow?.priority_order ?? 0) + 1

  const { data, error } = await supabase
    .from('staff')
    .insert({ name: trimmed, priority_order: nextPriority, is_new: true })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/staff  →  reorder | confirm | deactivate (admin only)
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  if (body.action === 'reorder') {
    const updates = body.order as { id: string; priority_order: number }[]
    await Promise.all(
      updates.map(({ id, priority_order }) =>
        supabase.from('staff').update({ priority_order }).eq('id', id)
      )
    )
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'confirm') {
    await supabase.from('staff').update({ is_new: false }).eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'deactivate') {
    await supabase.from('staff').update({ active: false }).eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'update_email') {
    await supabase
      .from('staff')
      .update({ email: body.email?.trim() || null })
      .eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'update_phone') {
    const phone = body.phone?.trim() || null
    const { data: staffRow } = await supabase.from('staff').select('name').eq('id', body.id).single()
    await supabase.from('staff').update({ phone, sms_opt_in_status: null }).eq('id', body.id)
    if (phone && staffRow?.name) {
      await textOptIn(phone, staffRow.name)
      await supabase.from('staff').update({ sms_opt_in_status: 'pending' }).eq('id', body.id)
    }
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'send_optin') {
    const { data: staffRow } = await supabase.from('staff').select('name, phone').eq('id', body.id).single()
    if (staffRow?.phone) {
      await textOptIn(staffRow.phone, staffRow.name)
      await supabase.from('staff').update({ sms_opt_in_status: 'pending' }).eq('id', body.id)
    }
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'set_optin_status') {
    await supabase.from('staff').update({ sms_opt_in_status: body.status ?? null }).eq('id', body.id)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'rename') {
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const newName = body.name.trim()

    // Get the current name before updating
    const { data: existing } = await supabase.from('staff').select('name').eq('id', body.id).single()
    if (!existing) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
    const oldName = existing.name

    // Cascade rename across all tables that store staff_name as text
    await Promise.all([
      supabase.from('staff').update({ name: newName }).eq('id', body.id),
      supabase.from('availability').update({ staff_name: newName }).eq('staff_name', oldName),
      supabase.from('assignments').update({ staff_name: newName }).eq('staff_name', oldName),
      supabase.from('availability_submissions').update({ staff_name: newName }).eq('staff_name', oldName),
      supabase.from('time_off_requests').update({ staff_name: newName }).eq('staff_name', oldName),
      supabase.from('shift_confirmations').update({ staff_name: newName }).eq('staff_name', oldName),
    ])

    return NextResponse.json({ ok: true })
  }

  if (body.action === 'add') {
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const { data: existing } = await supabase.from('staff').select('*').ilike('name', body.name.trim()).single()
    if (existing) {
      if (!existing.active) await supabase.from('staff').update({ active: true }).eq('id', existing.id)
      return NextResponse.json({ ...existing, active: true })
    }
    const { data: maxRow } = await supabase.from('staff').select('priority_order').order('priority_order', { ascending: false }).limit(1).single()
    const nextPriority = (maxRow?.priority_order ?? 0) + 1
    const { data, error } = await supabase.from('staff').insert({ name: body.name.trim(), priority_order: nextPriority, is_new: false }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
