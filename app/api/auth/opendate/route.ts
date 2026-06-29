import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'
import { getAuthUrl } from '@/lib/opendate'

export async function GET(req: NextRequest) {
  if (req.cookies.get(COOKIE_NAME)?.value !== getExpectedToken()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const state = crypto.randomUUID()
  const res = NextResponse.redirect(getAuthUrl(state))
  res.cookies.set('opendate_state', state, { httpOnly: true, secure: true, maxAge: 600 })
  return res
}
