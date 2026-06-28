import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return NextResponse.json({ ok: token === getExpectedToken() })
}

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
