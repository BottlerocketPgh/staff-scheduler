import { createHash } from 'crypto'

export const COOKIE_NAME = 'br_admin_session'

export function getExpectedToken(): string {
  const password = process.env.ADMIN_PASSWORD ?? 'unset'
  return createHash('sha256').update(`bottlerocket:${password}`).digest('hex')
}
