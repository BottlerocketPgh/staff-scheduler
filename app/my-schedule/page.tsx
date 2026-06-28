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
      fetch(`/api/assignments?month=${month}`).then((r) => r.json()),
      fetch(`/api/time-off?name=${encodeURIComponent(confirmedName)}&month=${month}`).then((r) =>
        r.json()
      ),
    ])
      .then(([assignRows, timeOffRows]) => {
        const map: Record<string, string> = {}
        for (const row of assignRows as { date: string; staff_name: string }[]) {
          map[row.date] = row.staff_name
        }
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
    ? Object.entries(assignments)
        .filter(([, name]) => name === confirmedName)
        .map(([date]) => date)
    : []

  const timeOffMap = new Map(timeOffRequests.map((r) => [r.date, r]))

  async function submitRequest(date: string) {
    setSubmitting(true)
    await fetch('/api/time-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_name: confirmedName, date, note: noteInput || null }),
    })
    setTimeOffRequests((prev) => {
      const next = prev.filter((r) => r.date !== date)
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
    setTimeOffRequests((prev) => prev.filter((r) => r.date !== date))
  }

  const weeks = confirmedName ? getCalendarWeeks(month) : []

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <a href="/" className="text-gray-500 text-sm hover:text-gray-300 mb-6 inline-block">
        ← Back
      </a>
      <h1 className="text-xl font-bold mb-6">My Schedule</h1>

      {!confirmedName ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Your name</label>
            <div className="relative">
              <input
                className="w-full bg-gray-800 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) confirmName(nameInput.trim()) }}
                placeholder="Start typing your name..."
                autoFocus
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg mt-1 shadow-lg overflow-hidden">
                  {suggestions.map((s) => (
                    <li
                      key={s}
                      className="px-4 py-2.5 hover:bg-gray-700 cursor-pointer text-sm"
                      onMouseDown={() => confirmName(s)}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
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
              <span className="font-medium text-gray-200">{confirmedName}</span>
              <button
                className="text-xs text-gray-500 hover:text-gray-300 underline"
                onClick={() => { setConfirmedName(''); setNameInput('') }}
              >
                change
              </button>
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
              {/* Calendar */}
              <div className="grid grid-cols-7 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
                ))}
              </div>
              <div className="space-y-1 mb-6">
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((date, di) => {
                      if (!date) return <div key={`e-${wi}-${di}`} className="aspect-square" />
                      const isMyShift = myDates.includes(date)
                      const isPast = date < today
                      const isToday = date === today
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
                                ? 'bg-yellow-900/40 border border-yellow-700/50 hover:bg-yellow-900/60 cursor-pointer'
                                : req?.status === 'approved'
                                  ? 'bg-green-900/30 border border-green-700/40 cursor-default'
                                  : 'bg-amber-700/40 border border-amber-600/50 hover:bg-amber-700/60 cursor-pointer'
                              : isMyShift && isPast
                                ? 'bg-gray-700/40 cursor-default'
                                : isToday
                                  ? 'bg-gray-800 border border-gray-700 cursor-default'
                                  : 'bg-gray-900/30 cursor-default',
                          ].join(' ')}
                        >
                          <span className={`text-xs leading-none ${isMyShift ? 'text-gray-200' : 'text-gray-600'}`}>
                            {dayNum}
                          </span>
                          {isMyShift && (
                            <span className={`text-[9px] font-semibold mt-auto leading-none ${
                              req?.status === 'pending' ? 'text-yellow-400' :
                              req?.status === 'approved' ? 'text-green-400' :
                              isPast ? 'text-gray-500' : 'text-amber-300'
                            }`}>
                              {req?.status === 'pending' ? 'req' :
                               req?.status === 'approved' ? 'off' :
                               'on'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-xs text-gray-500 mb-6">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-700/40 border border-amber-600/50 inline-block" />
                  Your shift
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-yellow-900/40 border border-yellow-700/50 inline-block" />
                  Request pending
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-green-900/30 border border-green-700/40 inline-block" />
                  Approved off
                </span>
              </div>

              {/* Request off panel */}
              {requestingDate && (
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  {timeOffMap.get(requestingDate) ? (
                    <>
                      <p className="text-sm font-medium mb-1">
                        Request pending for {fmtDateLong(requestingDate)}
                      </p>
                      {timeOffMap.get(requestingDate)?.note && (
                        <p className="text-xs text-gray-400 mb-3">
                          Note: {timeOffMap.get(requestingDate)?.note}
                        </p>
                      )}
                      <button
                        onClick={() => cancelRequest(requestingDate)}
                        className="text-sm text-red-400 hover:text-red-300 underline"
                      >
                        Cancel request
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-3">
                        Request off for {fmtDateLong(requestingDate)}?
                      </p>
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Optional note (e.g. 'out of town')"
                        rows={2}
                        className="w-full bg-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500 placeholder-gray-500 resize-none mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => submitRequest(requestingDate)}
                          disabled={submitting}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                        >
                          {submitting ? 'Sending...' : 'Send request'}
                        </button>
                        <button
                          onClick={() => setRequestingDate(null)}
                          className="text-sm text-gray-400 hover:text-gray-200 px-3 py-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {myDates.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">
                  No shifts assigned for this month yet.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}
