'use client'

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type StaffMember = {
  id: string
  name: string
  email: string | null
  priority_order: number
  is_new: boolean
  active: boolean
}

type DayData = {
  available: { name: string; priority_order: number; is_new: boolean }[]
  assigned: string | null
  confirmStatus: string | null
}

type MonthData = Record<string, DayData>

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = -3; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    options.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
  }
  return options
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function ConfirmBadge({ status }: { status: string }) {
  if (status === 'confirmed')
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-800 text-green-200">✓ Confirmed</span>
    )
  if (status === 'cancelled')
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-300">✗ Cancelled</span>
    )
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Reminder sent</span>
  )
}

// ── Password gate ──────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) onAuth()
    else setError('Incorrect password')
    setLoading(false)
  }

  return (
    <main className="max-w-sm mx-auto pt-32 px-6">
      <h1 className="text-xl font-bold mb-6 text-center">Admin</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-gray-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </main>
  )
}

// ── Schedule tab ───────────────────────────────────────────────────────────────

function ScheduleTab() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [data, setData] = useState<MonthData>({})
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; missing: string[] } | null>(null)
  const monthOptions = getMonthOptions()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setSendResult(null)
    setLoading(true)
    fetch(`/api/admin/month-view?month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [month])

  async function assign(date: string, name: string | null) {
    setAssigning(date)
    setData((prev) => ({
      ...prev,
      [date]: { ...prev[date], assigned: name, confirmStatus: null },
    }))
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, staff_name: name }),
    })
    setAssigning(null)
  }

  async function sendSchedule() {
    setSending(true)
    setSendResult(null)
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    const data = await res.json()
    setSendResult(data)
    setSending(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={sendSchedule}
            disabled={sending}
            className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send schedule emails'}
          </button>
          {sendResult && (
            <span className="text-sm text-gray-400">
              Sent to {sendResult.sent}.
              {sendResult.missing.length > 0 && (
                <span className="text-yellow-500"> Missing email: {sendResult.missing.join(', ')}</span>
              )}
            </span>
          )}
        </div>
        <select
          className="bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading...</div>
      ) : (
        <div className="space-y-2">
          {Object.entries(data).map(([date, day]) => {
            const isToday = date === today
            const isPast = date < today
            const isCancelled = day.confirmStatus === 'cancelled'
            return (
              <div
                key={date}
                className={[
                  'rounded-xl p-4',
                  isCancelled
                    ? 'bg-red-950/40 border border-red-800/40'
                    : isToday
                      ? 'bg-amber-900/20 border border-amber-700/30'
                      : isPast
                        ? 'bg-gray-900/50'
                        : 'bg-gray-800',
                ].join(' ')}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium mb-2 ${isPast ? 'text-gray-500' : 'text-gray-200'}`}
                    >
                      {fmtDate(date)}
                    </div>
                    {day.available.length === 0 ? (
                      <span className="text-xs text-gray-600">No one available</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {day.available.map((s) => {
                          const isAssigned = day.assigned === s.name
                          return (
                            <button
                              key={s.name}
                              onClick={() => assign(date, isAssigned ? null : s.name)}
                              disabled={assigning === date}
                              className={[
                                'flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:opacity-60',
                                isAssigned
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
                              ].join(' ')}
                            >
                              {isAssigned && <span>✓</span>}
                              {s.name}
                              {s.is_new && (
                                <span className="text-yellow-400 text-[10px] font-bold">NEW</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  {day.assigned && (
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <div className="text-xs text-gray-500">Assigned</div>
                      <div className="text-sm text-amber-400 font-medium">{day.assigned}</div>
                      {day.confirmStatus && <ConfirmBadge status={day.confirmStatus} />}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Staff tab ──────────────────────────────────────────────────────────────────

function StaffTab() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/staff')
      .then((r) => r.json())
      .then(setStaff)
      .finally(() => setLoading(false))
  }, [])

  async function move(id: string, dir: 'up' | 'down') {
    const idx = staff.findIndex((s) => s.id === id)
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === staff.length - 1) return
    const next = [...staff]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    const reordered = next.map((s, i) => ({ ...s, priority_order: i + 1 }))
    setStaff(reordered)
    setWorking(true)
    await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        order: reordered.map(({ id, priority_order }) => ({ id, priority_order })),
      }),
    })
    setWorking(false)
  }

  async function confirm(id: string) {
    setWorking(true)
    await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', id }),
    })
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, is_new: false } : s)))
    setWorking(false)
  }

  async function deactivate(id: string, name: string) {
    if (!window.confirm(`Remove ${name} from the schedule?`)) return
    setWorking(true)
    await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate', id }),
    })
    setStaff((prev) => prev.filter((s) => s.id !== id))
    setWorking(false)
  }

  async function saveEmail(id: string, email: string) {
    await fetch('/api/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_email', id, email }),
    })
  }

  if (loading) return <div className="text-gray-500 text-center py-12">Loading...</div>

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Priority 1 = highest. Use ↑↓ to reorder. Add email addresses so staff receive schedule
        notifications and shift reminders.
      </p>
      {staff.length === 0 ? (
        <div className="text-gray-600 text-center py-10">
          No staff yet — they&apos;ll appear here once someone submits availability.
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s, idx) => (
            <div
              key={s.id}
              className={[
                'flex items-center gap-3 rounded-xl px-4 py-3',
                s.is_new ? 'bg-yellow-900/20 border border-yellow-700/30' : 'bg-gray-800',
              ].join(' ')}
            >
              <span className="text-gray-600 text-sm w-5 text-right shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{s.name}</span>
                  {s.is_new && (
                    <span className="text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded shrink-0">
                      NEW
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  defaultValue={s.email ?? ''}
                  onBlur={(e) => saveEmail(s.id, e.target.value)}
                  placeholder="email@example.com"
                  className="text-xs bg-gray-700 rounded px-2 py-1 text-gray-300 w-full max-w-[220px] outline-none focus:ring-1 focus:ring-amber-500 placeholder-gray-600"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.is_new && (
                  <button
                    onClick={() => confirm(s.id)}
                    disabled={working}
                    className="text-xs bg-green-700 hover:bg-green-600 text-white px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                <button
                  onClick={() => move(s.id, 'up')}
                  disabled={working || idx === 0}
                  className="text-gray-400 hover:text-white disabled:opacity-20 text-lg leading-none px-1"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(s.id, 'down')}
                  disabled={working || idx === staff.length - 1}
                  className="text-gray-400 hover:text-white disabled:opacity-20 text-lg leading-none px-1"
                >
                  ↓
                </button>
                <button
                  onClick={() => deactivate(s.id, s.name)}
                  disabled={working}
                  className="text-gray-600 hover:text-red-400 text-sm disabled:opacity-50 transition-colors ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main admin page ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authChecked, setAuthChecked] = useState(false)
  const [isAuthed, setIsAuthed] = useState(false)
  const [tab, setTab] = useState<'schedule' | 'staff'>('schedule')

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => {
        setIsAuthed(d.ok)
        setAuthChecked(true)
      })
  }, [])

  if (!authChecked) return null
  if (!isAuthed) return <PasswordGate onAuth={() => setIsAuthed(true)} />

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-bold mb-6">Admin</h1>
      <div className="flex gap-2 mb-6">
        {(['schedule', 'staff'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'schedule' ? <ScheduleTab /> : <StaffTab />}
    </main>
  )
}
