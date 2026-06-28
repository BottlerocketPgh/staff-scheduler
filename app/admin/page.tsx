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

function fmtDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function getCalendarWeeks(month: string): (string | null)[][] {
  const [year, monthNum] = month.split('-').map(Number)
  const firstDow = new Date(year, monthNum - 1, 1).getDay()
  const numDays = new Date(year, monthNum, 0).getDate()
  const cells: (string | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= numDays; d++) {
    cells.push(`${month}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function ConfirmBadge({ status }: { status: string }) {
  if (status === 'confirmed')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-green-800 text-green-200">✓ Confirmed</span>
  if (status === 'cancelled')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-300">✗ Cancelled</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">Reminder sent</span>
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; missing: string[] } | null>(null)
  const monthOptions = getMonthOptions()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setSendResult(null)
    setSelectedDate(null)
    setLoading(true)
    fetch(`/api/admin/month-view?month=${month}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [month])

  async function assign(date: string, name: string | null) {
    setAssigning(true)
    setData((prev) => ({
      ...prev,
      [date]: { ...prev[date], assigned: name, confirmStatus: null },
    }))
    await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, staff_name: name }),
    })
    setAssigning(false)
  }

  async function sendSchedule() {
    setSending(true)
    setSendResult(null)
    const res = await fetch('/api/admin/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    setSendResult(await res.json())
    setSending(false)
  }

  const weeks = getCalendarWeeks(month)
  const selected = selectedDate ? data[selectedDate] : null

  return (
    <div>
      {/* Toolbar */}
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
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading...</div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
            ))}
          </div>
          <div className="space-y-1 mb-4">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((date, di) => {
                  if (!date) return <div key={`e-${wi}-${di}`} className="aspect-square" />
                  const day = data[date]
                  const isSelected = selectedDate === date
                  const isToday = date === today
                  const isPast = date < today
                  const isCancelled = day?.confirmStatus === 'cancelled'
                  const dayNum = parseInt(date.split('-')[2])

                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                      className={[
                        'aspect-square rounded-lg p-1.5 flex flex-col text-left transition-colors',
                        isSelected
                          ? 'ring-2 ring-amber-500 bg-gray-700'
                          : isCancelled
                            ? 'bg-red-950/50 hover:bg-red-950'
                            : day?.assigned
                              ? 'bg-amber-900/30 hover:bg-amber-900/50'
                              : isToday
                                ? 'bg-amber-900/20 border border-amber-700/40 hover:bg-amber-900/30'
                                : isPast
                                  ? 'bg-gray-900/40 hover:bg-gray-900/60'
                                  : 'bg-gray-800 hover:bg-gray-700',
                      ].join(' ')}
                    >
                      <span className={`text-xs leading-none ${isPast && !day?.assigned ? 'text-gray-600' : 'text-gray-400'}`}>
                        {dayNum}
                      </span>
                      {day?.assigned && (
                        <span className={`text-[10px] font-semibold leading-tight mt-auto truncate ${isCancelled ? 'text-red-400' : isPast ? 'text-gray-500' : 'text-amber-400'}`}>
                          {day.assigned.split(' ')[0]}
                        </span>
                      )}
                      {!day?.assigned && (day?.available?.length ?? 0) > 0 && (
                        <span className="mt-auto text-[8px] text-gray-600">
                          {day.available.length} avail
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Selected date panel */}
          {selectedDate && selected && (
            <div className={[
              'rounded-xl p-4 border',
              selected.confirmStatus === 'cancelled'
                ? 'bg-red-950/40 border-red-800/40'
                : 'bg-gray-800 border-gray-700',
            ].join(' ')}>
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-gray-100">{fmtDateLong(selectedDate)}</h2>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-500 hover:text-gray-300 text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {selected.available.length === 0 ? (
                <p className="text-sm text-gray-600">No one marked as available.</p>
              ) : (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Available — click to assign:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.available.map((s) => {
                      const isAssigned = selected.assigned === s.name
                      return (
                        <button
                          key={s.name}
                          onClick={() => assign(selectedDate, isAssigned ? null : s.name)}
                          disabled={assigning}
                          className={[
                            'flex items-center gap-1 text-sm px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-60',
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
                </div>
              )}

              {selected.assigned && (
                <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2">
                  <span className="text-sm text-gray-400">Assigned:</span>
                  <span className="text-sm text-amber-400 font-medium">{selected.assigned}</span>
                  {selected.confirmStatus && <ConfirmBadge status={selected.confirmStatus} />}
                </div>
              )}
            </div>
          )}
        </>
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

// ── Requests tab ──────────────────────────────────────────────────────────────

type TimeOffRequest = {
  id: string
  staff_name: string
  date: string
  note: string | null
  status: string
}

function fmtDateShort(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function RequestsTab() {
  const [requests, setRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/time-off?status=pending')
      .then((r) => r.json())
      .then(setRequests)
      .finally(() => setLoading(false))
  }, [])

  async function respond(id: string, status: 'approved' | 'denied') {
    setWorking(id)
    await fetch('/api/time-off', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setRequests((prev) => prev.filter((r) => r.id !== id))
    setWorking(null)
  }

  if (loading) return <div className="text-gray-500 text-center py-12">Loading...</div>

  return (
    <div>
      {requests.length === 0 ? (
        <div className="text-gray-600 text-center py-10">No pending time-off requests.</div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.staff_name}</div>
                <div className="text-sm text-amber-400">{fmtDateShort(r.date)}</div>
                {r.note && <div className="text-xs text-gray-400 mt-0.5">{r.note}</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => respond(r.id, 'approved')}
                  disabled={working === r.id}
                  className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => respond(r.id, 'denied')}
                  disabled={working === r.id}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Deny
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
  const [tab, setTab] = useState<'schedule' | 'staff' | 'requests'>('schedule')

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
        {(['schedule', 'staff', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'schedule' ? <ScheduleTab /> : tab === 'staff' ? <StaffTab /> : <RequestsTab />}
    </main>
  )
}
