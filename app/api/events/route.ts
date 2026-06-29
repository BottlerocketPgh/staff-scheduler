import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents } from '@/lib/opendate'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const month = req.nextUrl.searchParams.get('month')
  if (date) {
    const next = new Date(date + 'T00:00:00')
    next.setDate(next.getDate() + 1)
    const end = next.toISOString().split('T')[0]
    const events = await fetchEvents(date, end)
    return NextResponse.json(events)
  }
  if (month) {
    const [y, m] = month.split('-').map(Number)
    const start = `${month}-01`
    // Use first day of next month so late-night events on the last day aren't excluded
    const end = new Date(y, m, 1).toISOString().split('T')[0]
    const events = await fetchEvents(start, end)
    return NextResponse.json(events)
  }
  return NextResponse.json({ error: 'Missing date or month' }, { status: 400 })
}
