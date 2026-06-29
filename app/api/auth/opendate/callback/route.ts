import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, storeTokens } from '@/lib/opendate'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState = req.cookies.get('opendate_state')?.value

  if (!code) return NextResponse.redirect(new URL('/admin?opendate=error&reason=no_code', req.url))
  if (!state || state !== storedState) return NextResponse.redirect(new URL('/admin?opendate=error&reason=bad_state', req.url))

  const tokens = await exchangeCode(code)
  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(new URL(`/admin?opendate=error&reason=${tokens.error ?? 'no_token'}`, req.url))
  }

  await storeTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in)

  const res = NextResponse.redirect(new URL('/admin?opendate=connected', req.url))
  res.cookies.delete('opendate_state')
  return res
}
