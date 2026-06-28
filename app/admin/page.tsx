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
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    options.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
  }
  return options
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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
    return <span className="text-xs px-1.5 py-0.5 rounded bg-steel text-cream">✓ Confirmed</span>
  if (status === 'cancelled')
    return <span className="text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-300">✗ Cancelled</span>
  return <span className="text-xs px-1.5 py-0.5 rounded bg-forest/8 text-forest/50">Reminder sent</span>
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
      <p className="text-forest-dark font-bold tracking-tight">Flight Deck</p>
      <p className="text-forest/40 text-xs mb-1">a scheduling tool by Bottlerocket</p>
      <h1 className="text-xl font-bold mb-6 text-center text-forest-dark">Admin</h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-white border border-forest/20 rounded-lg px-4 py-2.5 text-forest-dark outline-none focus:ring-2 focus:ring-rust placeholder-forest/30"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full bg-rust hover:bg-rust-dark text-cream py-2.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
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
  const [submissions, setSubmissions] = useState<{ staff_name: string }[]>([])
  const [unlocking, setUnlocking] = useState(false)
  const [allStaff, setAllStaff] = useState<string[]>([])
  const [showSubmissions, setShowSubmissions] = useState(false)
  const [unlockingName, setUnlockingName] = useState<string | null>(null)
  const monthOptions = getMonthOptions()
  const today = new Date().toISOString().split('T')[0]

  function loadMonth(m: string) {
    setSendResult(null)
    setSelectedDate(null)
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/month-view?month=${m}`).then((r) => r.json()),
      fetch(`/api/availability/submit?month=${m}`).then((r) => r.json()),
      fetch('/api/staff').then((r) => r.json()),
    ])
      .then(([monthData, subs, staffList]) => {
        setData(monthData)
        setSubmissions(Array.isArray(subs) ? subs : [])
        setAllStaff((staffList as { name: string }[]).map((s) => s.name))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMonth(month) }, [month])

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
    // Auto-unlock all submissions for this month after publishing
    await fetch('/api/availability/submit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    setSubmissions([])
  }

  async function unlockAll() {
    setUnlocking(true)
    await fetch('/api/availability/submit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    setSubmissions([])
    setUnlocking(false)
  }

  async function unlockOne(name: string) {
    setUnlockingName(name)
    await fetch('/api/availability/submit', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, name }),
    })
    setSubmissions((prev) => prev.filter((s) => s.staff_name !== name))
    setUnlockingName(null)
  }

  const weeks = getCalendarWeeks(month)
  const selected = selectedDate ? data[selectedDate] : null

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={sendSchedule}
            disabled={sending}
            className="bg-rust hover:bg-rust-dark text-cream text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : `Send Confirmed Schedule — ${monthLabel(month)}`}
          </button>
          {allStaff.length > 0 && (
            <button
              onClick={() => setShowSubmissions(true)}
              className="text-sm text-forest/50 hover:text-forest-dark underline transition-colors"
            >
              {submissions.length}/{allStaff.length} submitted availability
            </button>
          )}
          {sendResult && (
            <span className="text-sm text-forest/50">
              Sent to {sendResult.sent}.
              {sendResult.missing.length > 0 && (
                <span className="text-honey"> Missing email: {sendResult.missing.join(', ')}</span>
              )}
            </span>
          )}
        </div>
        <select
          className="bg-white border border-forest/20 rounded-lg px-3 py-2 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-rust"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-forest/40 text-center py-12">Loading...</div>
      ) : (
        <>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs text-forest/40 py-1">{d}</div>
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
                          ? 'ring-2 ring-rust bg-forest/8'
                          : isCancelled
                            ? 'bg-red-950/50 hover:bg-red-950'
                            : day?.assigned
                              ? 'bg-rust/10 hover:bg-rust/20'
                              : isToday
                                ? 'bg-rust/10 border border-rust/30 hover:bg-rust/20'
                                : isPast
                                  ? 'bg-white hover:bg-white'
                                  : 'bg-white hover:bg-forest/8',
                      ].join(' ')}
                    >
                      <span className={`text-xs leading-none ${isPast && !day?.assigned ? 'text-forest/25' : 'text-forest/50'}`}>
                        {dayNum}
                      </span>
                      {day?.assigned && (
                        <span className={`text-[10px] font-semibold leading-tight mt-auto truncate ${isCancelled ? 'text-red-400' : isPast ? 'text-forest/40' : 'text-rust'}`}>
                          {day.assigned.split(' ')[0]}
                        </span>
                      )}
                      {!day?.assigned && (day?.available?.length ?? 0) > 0 && (
                        <div className="mt-auto flex flex-col gap-px">
                          {day.available.slice(0, 3).map((s) => (
                            <span key={s.name} className="text-[8px] text-forest/70 leading-none truncate">
                              {s.name.split(' ')[0]}
                            </span>
                          ))}
                          {day.available.length > 3 && (
                            <span className="text-[8px] text-forest/50 leading-none">+{day.available.length - 3}</span>
                          )}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Submissions modal */}
          {showSubmissions && (
            <div className="fixed inset-0 bg-forest-dark/80 flex items-start justify-center z-50 p-4 pt-20">
              <div className="bg-white border border-forest/15 rounded-2xl p-5 w-full max-w-sm max-h-[70vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-forest-dark">Availability — {monthLabel(month)}</h2>
                  <button onClick={() => setShowSubmissions(false)} className="text-forest/40 hover:text-forest-dark text-lg leading-none">✕</button>
                </div>

                {submissions.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs text-forest/40 uppercase tracking-wider mb-2">Submitted</p>
                    <div className="space-y-1">
                      {submissions.map((s) => (
                        <div key={s.staff_name} className="flex items-center justify-between py-1">
                          <span className="text-sm text-forest-dark">{s.staff_name}</span>
                          <button
                            onClick={() => unlockOne(s.staff_name)}
                            disabled={!!unlockingName}
                            className="text-xs text-forest/40 hover:text-rust-light underline disabled:opacity-40 transition-colors"
                          >
                            {unlockingName === s.staff_name ? 'Unlocking...' : 'Unlock'}
                          </button>
                        </div>
                      ))}
                    </div>
                    {submissions.length > 1 && (
                      <button
                        onClick={async () => { await unlockAll(); setShowSubmissions(false) }}
                        disabled={unlocking}
                        className="mt-3 text-xs text-forest/40 hover:text-rust-light underline disabled:opacity-50 transition-colors"
                      >
                        {unlocking ? 'Unlocking...' : 'Unlock all'}
                      </button>
                    )}
                  </div>
                )}

                {(() => {
                  const submittedNames = new Set(submissions.map((s) => s.staff_name))
                  const notSubmitted = allStaff.filter((name) => !submittedNames.has(name))
                  if (notSubmitted.length === 0) return null
                  return (
                    <div>
                      <p className="text-xs text-forest/40 uppercase tracking-wider mb-2">Not yet submitted</p>
                      <div className="space-y-1">
                        {notSubmitted.map((name) => (
                          <div key={name} className="py-1">
                            <span className="text-sm text-forest/40">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Selected date panel */}
          {selectedDate && selected && (
            <div className={[
              'rounded-xl p-4 border',
              selected.confirmStatus === 'cancelled'
                ? 'bg-red-950/40 border-red-800/40'
                : 'bg-white border-forest/15',
            ].join(' ')}>
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-forest-dark">{fmtDateLong(selectedDate)}</h2>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-forest/40 hover:text-forest/70 text-lg leading-none"
                >
                  ✕
                </button>
              </div>

              {selected.available.length === 0 ? (
                <p className="text-sm text-forest/25">No one marked as available.</p>
              ) : (
                <div>
                  <p className="text-xs text-forest/40 mb-2">Available — click to assign:</p>
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
                              ? 'bg-rust text-cream'
                              : 'bg-forest/8 text-forest/70 hover:bg-forest/15',
                          ].join(' ')}
                        >
                          {isAssigned && <span>✓</span>}
                          {s.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {selected.assigned && (
                <div className="mt-3 pt-3 border-t border-forest/15 flex items-center gap-2">
                  <span className="text-sm text-forest/50">Assigned:</span>
                  <span className="text-sm text-honey font-medium">{selected.assigned}</span>
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

  if (loading) return <div className="text-forest/40 text-center py-12">Loading...</div>

  return (
    <div>
      <p className="text-sm text-forest/40 mb-4">
        Priority 1 = highest. Use ↑↓ to reorder. Add email addresses so staff receive schedule
        notifications and shift reminders.
      </p>
      {staff.length === 0 ? (
        <div className="text-forest/25 text-center py-10">
          No staff yet — they&apos;ll appear here once someone submits availability.
        </div>
      ) : (
        <div className="space-y-2">
          {staff.map((s, idx) => (
            <div
              key={s.id}
              className={[
                'flex items-center gap-3 rounded-xl px-4 py-3',
                'bg-white border border-forest/10',
              ].join(' ')}
            >
              <span className="text-forest/25 text-sm w-5 text-right shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate text-forest-dark">{s.name}</span>
                </div>
                <input
                  type="email"
                  defaultValue={s.email ?? ''}
                  onBlur={(e) => saveEmail(s.id, e.target.value)}
                  placeholder="email@example.com"
                  className="text-xs bg-white border border-forest/20 rounded px-2 py-1 text-forest/70 w-full max-w-[220px] outline-none focus:ring-1 focus:ring-rust placeholder-forest/30"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.is_new && (
                  <button
                    onClick={() => confirm(s.id)}
                    disabled={working}
                    className="text-xs bg-steel hover:bg-steel-dark text-cream px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Confirm
                  </button>
                )}
                <button
                  onClick={() => move(s.id, 'up')}
                  disabled={working || idx === 0}
                  className="text-forest/50 hover:text-forest-dark disabled:opacity-20 text-lg leading-none px-1"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(s.id, 'down')}
                  disabled={working || idx === staff.length - 1}
                  className="text-forest/50 hover:text-forest-dark disabled:opacity-20 text-lg leading-none px-1"
                >
                  ↓
                </button>
                <button
                  onClick={() => deactivate(s.id, s.name)}
                  disabled={working}
                  className="text-forest/25 hover:text-red-400 text-sm disabled:opacity-50 transition-colors ml-1"
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

  if (loading) return <div className="text-forest/40 text-center py-12">Loading...</div>

  return (
    <div>
      {requests.length === 0 ? (
        <div className="text-forest/25 text-center py-10">No pending time-off requests.</div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="bg-white border border-forest/10 rounded-xl px-4 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-forest-dark">{r.staff_name}</div>
                <div className="text-sm text-honey">{fmtDateShort(r.date)}</div>
                {r.note && <div className="text-xs text-forest/50 mt-0.5">{r.note}</div>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => respond(r.id, 'approved')}
                  disabled={working === r.id}
                  className="text-xs bg-steel hover:bg-steel-dark text-cream px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => respond(r.id, 'denied')}
                  disabled={working === r.id}
                  className="text-xs bg-forest/8 hover:bg-forest/15 text-forest/70 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
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
      <p className="text-forest-dark font-bold tracking-tight">Flight Deck</p>
      <p className="text-forest/40 text-xs mb-1">a scheduling tool by Bottlerocket</p>
      <h1 className="text-xl font-bold text-forest-dark mb-6">Admin</h1>
      <div className="flex gap-2 mb-6">
        {(['schedule', 'staff', 'requests'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-rust text-cream' : 'bg-white border border-forest/10 text-forest/50 hover:text-forest-dark',
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
