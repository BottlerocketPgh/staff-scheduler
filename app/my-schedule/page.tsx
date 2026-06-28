'use client'

import { useState, useEffect, useRef } from 'react'

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i <= 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    options.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
  }
  return options
}

function gcalUrl(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${y}${pad(m)}${pad(d)}T160000`
  const end   = `${y}${pad(m)}${pad(d)}T220000`
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Bottlerocket+Shift&dates=${start}/${end}&details=Flight+Deck+shift+at+Bottlerocket&location=Bottlerocket+Social+Hall%2C+Pittsburgh+PA`
}

function fmtDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
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

type TimeOffStatus = 'pending' | 'approved' | 'denied'
type TimeOffRequest = { date: string; status: TimeOffStatus; note: string | null }

export default function MySchedulePage() {
  const [nameInput, setNameInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedName, setConfirmedName] = useState('')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [requestingDate, setRequestingDate] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const today = new Date().toISOString().split('T')[0]
  const monthOptions = getMonthOptions()

  useEffect(() => {
    if (!nameInput.trim() || confirmedName) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/staff?q=${encodeURIComponent(nameInput)}`)
      setSuggestions(await res.json())
    }, 200)
  }, [nameInput, confirmedName])

  useEffect(() => {
    if (!confirmedName) return
    setLoading(true)
    Promise.all([
      fetch(`/api/assignments?month=${month}`).then(r => r.json()),
      fetch(`/api/time-off?name=${encodeURIComponent(confirmedName)}&month=${month}`).then(r => r.json()),
    ])
      .then(([assignRows, timeOffRows]) => {
        const map: Record<string, string> = {}
        for (const row of assignRows as { date: string; staff_name: string }[]) map[row.date] = row.staff_name
        setAssignments(map)
        setTimeOffRequests(timeOffRows as TimeOffRequest[])
      })
      .finally(() => setLoading(false))
  }, [confirmedName, month])

  function confirmName(n: string) {
    setNameInput(n)
    setConfirmedName(n)
    setShowSuggestions(false)
    setSuggestions([])
  }

  const myDates = confirmedName
    ? Object.entries(assignments).filter(([, name]) => name === confirmedName).map(([date]) => date)
    : []

  const timeOffMap = new Map(timeOffRequests.map(r => [r.date, r]))

  async function submitRequest(date: string) {
    setSubmitting(true)
    await fetch('/api/time-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_name: confirmedName, date, note: noteInput || null }),
    })
    setTimeOffRequests(prev => {
      const next = prev.filter(r => r.date !== date)
      next.push({ date, status: 'pending', note: noteInput || null })
      return next
    })
    setRequestingDate(null)
    setNoteInput('')
    setSubmitting(false)
  }

  async function cancelRequest(date: string) {
    await fetch('/api/time-off', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_name: confirmedName, date }),
    })
    setTimeOffRequests(prev => prev.filter(r => r.date !== date))
    setRequestingDate(null)
  }

  const weeks = confirmedName ? getCalendarWeeks(month) : []

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <a href="/" className="text-forest/40 text-sm hover:text-forest/70 mb-6 inline-block transition-colors">
        ← Back
      </a>
      <h1 className="text-xl font-bold mb-6 text-forest-dark">My Schedule</h1>

      {!confirmedName ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-forest/60 mb-1.5">Your name</label>
            <div className="relative">
              <input
                className="w-full bg-white border border-forest/20 rounded-lg px-4 py-2.5 text-forest-dark outline-none focus:ring-2 focus:ring-rust placeholder-forest/30"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) confirmName(nameInput.trim()) }}
                placeholder="Start typing your name..."
                autoFocus
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-forest/20 rounded-lg mt-1 shadow-xl overflow-hidden">
                  {suggestions.map(s => (
                    <li key={s} className="px-4 py-2.5 hover:bg-forest/8 cursor-pointer text-sm text-forest-dark" onMouseDown={() => confirmName(s)}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            className="bg-rust hover:bg-rust-dark text-cream px-5 py-2.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
            disabled={!nameInput.trim()}
            onClick={() => confirmName(nameInput.trim())}
          >
            View my schedule
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-forest-dark">{confirmedName}</span>
              <button className="text-xs text-forest/40 hover:text-forest/70 underline" onClick={() => { setConfirmedName(''); setNameInput('') }}>
                change
              </button>
            </div>
            <select
              className="bg-white border border-forest/20 rounded-lg px-3 py-2 text-sm text-forest-dark outline-none focus:ring-2 focus:ring-rust"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-forest/40 text-center py-12">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-7 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} className="text-center text-xs text-forest/40 py-1">{d}</div>
                ))}
              </div>
              <div className="space-y-1 mb-6">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((date, di) => {
                      if (!date) return <div key={`e-${wi}-${di}`} className="aspect-square" />
                      const isMyShift = myDates.includes(date)
                      const isPast = date < today
                      const req = timeOffMap.get(date)
                      const dayNum = parseInt(date.split('-')[2])

                      return (
                        <button
                          key={date}
                          onClick={() => {
                            if (!isMyShift || isPast) return
                            setRequestingDate(requestingDate === date ? null : date)
                            setNoteInput('')
                          }}
                          disabled={!isMyShift || isPast}
                          className={[
                            'aspect-square rounded-lg p-1 flex flex-col transition-colors',
                            isMyShift && !isPast
                              ? req?.status === 'pending'
                                ? 'bg-honey/20 border border-honey/40 hover:bg-honey/30 cursor-pointer'
                                : req?.status === 'approved'
                                  ? 'bg-steel/20 border border-steel/30 cursor-default'
                                  : 'bg-rust/30 border border-rust/50 hover:bg-rust/40 cursor-pointer'
                              : isMyShift && isPast
                                ? 'bg-white/80 cursor-default'
                                : 'bg-forest/5 cursor-default',
                          ].join(' ')}
                        >
                          <span className={`text-xs leading-none ${isMyShift ? 'text-forest/70' : 'text-forest/20'}`}>
                            {dayNum}
                          </span>
                          {isMyShift && (
                            <span className={`text-[9px] font-semibold mt-auto leading-none ${
                              req?.status === 'pending' ? 'text-honey' :
                              req?.status === 'approved' ? 'text-steel-light' :
                              isPast ? 'text-forest/30' : 'text-rust-light'
                            }`}>
                              {req?.status === 'pending' ? 'req' : req?.status === 'approved' ? 'off' : 'on'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 text-xs text-forest/40 mb-6">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rust/30 border border-rust/50 inline-block" />
                  Your shift
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-honey/20 border border-honey/40 inline-block" />
                  Request pending
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-steel/20 border border-steel/30 inline-block" />
                  Approved off
                </span>
              </div>

              {requestingDate && (
                <div className="bg-white border border-forest/15 rounded-xl p-4">
                  {timeOffMap.get(requestingDate) ? (
                    <>
                      <p className="text-sm font-medium text-forest-dark mb-1">
                        Request pending for {fmtDateLong(requestingDate)}
                      </p>
                      {timeOffMap.get(requestingDate)?.note && (
                        <p className="text-xs text-forest/50 mb-3">Note: {timeOffMap.get(requestingDate)?.note}</p>
                      )}
                      <button onClick={() => cancelRequest(requestingDate)} className="text-sm text-red-400 hover:text-red-300 underline">
                        Cancel request
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-forest-dark mb-3">
                        Request off for {fmtDateLong(requestingDate)}?
                      </p>
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Optional note (e.g. 'out of town')"
                        rows={2}
                        className="w-full bg-white border border-forest/20 rounded-lg px-3 py-2 text-sm text-forest-dark outline-none focus:ring-1 focus:ring-rust placeholder-forest/30 resize-none mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitRequest(requestingDate)}
                          disabled={submitting}
                          className="bg-rust hover:bg-rust-dark text-cream text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                        >
                          {submitting ? 'Sending...' : 'Send request'}
                        </button>
                        <button onClick={() => setRequestingDate(null)} className="text-sm text-forest/40 hover:text-forest/70 px-3 py-2">
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {myDates.length === 0 && (
                <p className="text-forest/30 text-sm text-center py-4">No shifts assigned for this month yet.</p>
              )}

              {myDates.filter(d => d >= today).length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-forest/40 uppercase tracking-wider mb-2">Add to Google Calendar</p>
                  {myDates.filter(d => d >= today).sort().map(date => (
                    <a
                      key={date}
                      href={gcalUrl(date)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white border border-forest/10 rounded-lg px-3 py-2 hover:bg-forest/5 transition-colors"
                    >
                      <span className="text-sm text-forest/70">{fmtDateLong(date)}</span>
                      <span className="text-xs text-steel ml-3 shrink-0">+ GCal</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}
