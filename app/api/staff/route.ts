import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'

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

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
