import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.EMAIL_FROM ?? 'Bottlerocket Staff <schedule@bottlerocketpgh.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://staff.bottlerocketpgh.com'

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function btn(url: string, label: string, bg: string) {
  return `<a href="${url}" style="display:inline-block;padding:10px 22px;background:${bg};color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${label}</a>`
}

export async function sendTimeOffRequest(
  adminEmail: string,
  staffName: string,
  date: string,
  note: string | null
) {
  const formatted = fmtDate(date)
  await getResend().emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Time-off request: ${staffName} — ${formatted}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.5;">
        <p><strong>${staffName}</strong> has requested off for <strong>${formatted}</strong>.</p>
        ${note ? `<p>Note: <em>${note}</em></p>` : ''}
        <p>Review it in the <a href="${APP_URL}/admin">admin panel</a>.</p>
        <p style="color:#666;font-size:13px;margin-top:32px;">— Bottlerocket Staff App</p>
      </div>
    `,
  })
}

export async function sendFullSchedule(
  to: string,
  name: string,
  month: string,
  assignments: { date: string; staff_name: string }[]
) {
  const [year, monthNum] = month.split('-').map(Number)
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
  const sorted = [...assignments].sort((a, b) => a.date.localeCompare(b.date))
  const rows = sorted
    .map(
      (a) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#555;">${fmtDate(a.date)}</td><td style="padding:4px 0;font-weight:600;">${a.staff_name}</td></tr>`
    )
    .join('')

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Bottlerocket Schedule — ${monthLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.5;">
        <p>Hey ${name},</p>
        <p>Here's the confirmed tech schedule for <strong>${monthLabel}</strong>:</p>
        <table style="border-collapse:collapse;margin:16px 0;">${rows}</table>
        <p style="color:#666;font-size:13px;margin-top:32px;">— Bottlerocket Social Hall</p>
      </div>
    `,
  })
}

export async function sendSchedulePublished(to: string, name: string, dates: string[]) {
  const sorted = [...dates].sort()
  const items = sorted.map((d) => `<li style="margin:4px 0;">${fmtDate(d)}</li>`).join('')

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Your upcoming Bottlerocket shows',
    html: `
      <div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.5;">
        <p>Hey ${name},</p>
        <p>Your schedule has been confirmed. Here are your upcoming shows:</p>
        <ul style="padding-left:20px;">${items}</ul>
        <p>You'll get a reminder 2 days before each show — just click to confirm you can still make it.</p>
        <p style="color:#666;font-size:13px;margin-top:32px;">— Bottlerocket Social Hall</p>
      </div>
    `,
  })
}

export async function sendShiftReminder(to: string, name: string, date: string, token: string) {
  const formatted = fmtDate(date)
  const yesUrl = `${APP_URL}/confirm/${token}/yes`
  const noUrl = `${APP_URL}/confirm/${token}/no`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Reminder: You're on for ${formatted}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;color:#1a1a1a;line-height:1.5;">
        <p>Hey ${name},</p>
        <p>Reminder that you're scheduled to run tech at Bottlerocket on <strong>${formatted}</strong>.</p>
        <p>Can you still make it?</p>
        <p style="margin:28px 0;">
          ${btn(yesUrl, '✓ Yes, I\'m good', '#b45309')}
          &nbsp;&nbsp;
          ${btn(noUrl, '✗ I need to cancel', '#6b7280')}
        </p>
        <p style="color:#666;font-size:13px;margin-top:32px;">— Bottlerocket Social Hall</p>
      </div>
    `,
  })
}
