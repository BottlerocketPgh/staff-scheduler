const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://staff.bottlerocketpgh.com'

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function fmtMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

async function send(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) return false
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    }
  )
  return res.ok
}

export async function textShiftReminder(phone: string, name: string, date: string, token: string) {
  const yesUrl = `${APP_URL}/confirm/${token}/yes`
  const noUrl  = `${APP_URL}/confirm/${token}/no`
  await send(phone, `Hey ${name} — you're on tech at Bottlerocket ${fmtDate(date)}. Still good?\nYES: ${yesUrl}\nCan't make it: ${noUrl}\nReply STOP to opt out.`)
}

export async function textSchedulePublished(phone: string, name: string, dates: string[]) {
  const list = [...dates].sort().map(fmtDate).join(', ')
  await send(phone, `Hey ${name}, your Bottlerocket schedule is confirmed! You're on for: ${list}. You'll get a reminder 2 days before each show. — Flight Deck. Reply STOP to opt out.`)
}

export async function textTimeOffToAdmin(staffName: string, date: string, note: string | null) {
  const adminPhone = process.env.ADMIN_PHONE
  if (!adminPhone) return
  const noteStr = note ? ` Note: "${note}".` : ''
  await send(adminPhone, `${staffName} requested off for ${fmtDate(date)}.${noteStr} Review: ${APP_URL}/admin`)
}

export async function textSubAvailable(phone: string, name: string, absentName: string, date: string, token: string) {
  const url = `${APP_URL}/sub/${token}`
  await send(phone, `Sub needed at Bottlerocket on ${fmtDate(date)} — ${absentName} can't make it. Can you cover? Let us know: ${url} Reply STOP to opt out.`)
}

export async function textSubClaimed(adminPhone: string, claimerName: string, absentName: string, date: string) {
  await send(adminPhone, `✓ ${claimerName} can cover ${fmtDate(date)}! (Sub for ${absentName}) — Flight Deck`)
}

export async function textSubDeclined(adminPhone: string, declinerName: string, absentName: string, date: string) {
  await send(adminPhone, `✗ ${declinerName} can't cover ${fmtDate(date)}. (Sub for ${absentName}) — Flight Deck`)
}

export async function textAvailabilitySubmitted(staffName: string, month: string) {
  const adminPhone = process.env.ADMIN_PHONE
  if (!adminPhone) return
  await send(adminPhone, `${staffName} submitted their availability for ${fmtMonth(month)} on Flight Deck.`)
}

export async function textAvailabilityReminder(phone: string, name: string, month: string) {
  await send(phone, `Hey ${name} — reminder to submit your availability for ${fmtMonth(month)} at ${APP_URL} Reply STOP to opt out.`)
}
