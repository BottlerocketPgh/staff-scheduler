import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/opendate'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })
  const events = await fetchEvents(month)
  return NextResponse.json(events)
}
