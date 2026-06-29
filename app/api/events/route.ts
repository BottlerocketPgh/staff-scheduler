import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents, getValidToken } from '@/lib/opendate'

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month')
  if (!month) return NextResponse.json({ error: 'Missing month' }, { status: 400 })

  if (req.nextUrl.searchParams.get('debug') === '1') {
    const token = await getValidToken()
    return NextResponse.json({
      hasToken: !!token,
      hasEnvVars: {
        username: !!process.env.OPENDATE_USERNAME,
        password: !!process.env.OPENDATE_PASSWORD,
        clientId: !!process.env.OPENDATE_CLIENT_ID,
        clientSecret: !!process.env.OPENDATE_CLIENT_SECRET,
      },
    })
  }

  const events = await fetchEvents(month)
  return NextResponse.json(events)
}
