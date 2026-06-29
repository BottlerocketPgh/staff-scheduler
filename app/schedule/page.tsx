'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

function fmtDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

const CACHE_KEY = 'od_events_v4'
const CACHE_TTL = 4 * 60 * 60 * 1000

function readEventsCache(m: string): Record<string, { name: string; url: string }[]> | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}_${m}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function writeEventsCache(m: string, data: Record<string, { name: string; url: string }[]>) {
  try {
    localStorage.setItem(`${CACHE_KEY}_${m}`, JSON.stringify({ data, ts: Date.now() }))
  } catch {}
}

export default function SchedulePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [noTechDates, setNoTechDates] = useState<Set<string>>(new Set())
  const [events, setEvents] = useState<Record<string, { name: string; url: string }[]>>({})
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const monthOptions = getMonthOptions()

  useEffect(() => {
    setLoading(true)
    setSelectedDate(null)

    const cached = readEventsCache(month)
    if (cached) setEvents(cached)
    else {
      setEvents({})
      fetch(`/api/events?month=${month}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data === 'object' && !data.error) {
            setEvents(data)
            writeEventsCache(month, data)
          }
        })
        .catch(() => {})
    }

    Promise.all([
      fetch(`/api/assignments?month=${month}`).then((r) => r.json()),
      fetch(`/api/no-tech?month=${month}`).then((r) => r.json()),
    ]).then(([rows, noTech]: [{ date: string; staff_name: string }[], string[]]) => {
      const map: Record<string, string> = {}
      for (const row of rows) map[row.date] = row.staff_name
      setAssignments(map)
      setNoTechDates(new Set(noTech))
    }).finally(() => setLoading(false))
  }, [month])

  const weeks = getCalendarWeeks(month)

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <a href="/" className="text-forest/40 text-sm hover:text-forest/70 mb-6 inline-block transition-colors">
        ← Back
      </a>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-forest-dark">Schedule</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/availability"
            className="text-sm bg-rust hover:bg-rust-dark text-cream px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Submit availability
          </Link>
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
      </div>

      {loading ? (
        <div className="text-forest/40 text-center py-12">Loading...</div>
      ) : (
        <>
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
                  const assigned = assignments[date]
                  const isNoTech = noTechDates.has(date)
                  const isToday = date === today
                  const isPast = date < today
                  const isSelected = selectedDate === date
                  const hasEvent = (events[date]?.length ?? 0) > 0
                  const dayNum = parseInt(date.split('-')[2])
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                      className={[
                        'aspect-square rounded-lg p-1.5 flex flex-col text-left transition-colors',
                        isSelected
                          ? 'ring-2 ring-rust bg-forest/8'
                          : isToday
                            ? 'bg-rust/20 border border-rust/40 hover:bg-rust/30'
                            : isPast
                              ? 'bg-white hover:bg-forest/5'
                              : assigned || isNoTech
                                ? 'bg-white border border-honey/20 hover:bg-forest/5'
                                : 'bg-white hover:bg-forest/5',
                      ].join(' ')}
                    >
                      <span className={`text-xs leading-none ${isPast && !assigned && !isNoTech ? 'text-forest/25' : 'text-forest/50'}`}>
                        {dayNum}
                      </span>
                      {isNoTech ? (
                        <span className={`text-[10px] font-semibold leading-tight mt-auto truncate ${isPast ? 'text-forest/30' : 'text-forest/40'}`}>
                          N/A
                        </span>
                      ) : assigned ? (
                        <>
                          <span className={`text-[10px] font-semibold leading-tight mt-auto truncate ${isPast ? 'text-forest/30' : 'text-rust'}`}>
                            {assigned.split(' ')[0]}
                          </span>
                          {hasEvent && <span className="w-1 h-1 rounded-full bg-steel mt-0.5 shrink-0" />}
                        </>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {selectedDate && (
            <div className="bg-white border border-forest/15 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="font-semibold text-forest-dark">{fmtDateLong(selectedDate)}</h2>
                  {(events[selectedDate] ?? []).map((ev) => (
                    <a
                      key={ev.url}
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-steel hover:text-steel-dark underline mt-0.5 block"
                    >
                      {ev.name}
                    </a>
                  ))}
                </div>
                <button onClick={() => setSelectedDate(null)} className="text-forest/40 hover:text-forest/70 text-lg leading-none">✕</button>
              </div>
              {assignments[selectedDate] ? (
                <p className="text-sm text-forest/60">
                  Tech: <span className="font-medium text-rust">{assignments[selectedDate]}</span>
                </p>
              ) : noTechDates.has(selectedDate) ? (
                <p className="text-sm text-forest/40">No Tech Needed</p>
              ) : (
                <p className="text-sm text-forest/25">No tech assigned yet.</p>
              )}
            </div>
          )}
        </>
      )}
    </main>
  )
}
