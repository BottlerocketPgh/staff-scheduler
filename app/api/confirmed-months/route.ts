import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })
  const { data } = await supabase.from('confirmed_months').select('month').eq('month', month).maybeSingle()
  return NextResponse.json({ confirmed: !!data })
}
