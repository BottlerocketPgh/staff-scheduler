'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = -2; i <= 6; i++) {
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

export default function SchedulePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const monthOptions = getMonthOptions()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/assignments?month=${month}`)
      .then((r) => r.json())
      .then((rows: { date: string; staff_name: string }[]) => {
        const map: Record<string, string> = {}
        for (const row of rows) map[row.date] = row.staff_name
        setAssignments(map)
      })
      .finally(() => setLoading(false))
  }, [month])

  const weeks = getCalendarWeeks(month)

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <a href="/" className="text-gray-500 text-sm hover:text-gray-300 mb-6 inline-block">
        ← Back
      </a>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-xl font-bold">Schedule</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/availability"
            className="text-sm bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Submit availability
          </Link>
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
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-12">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs text-gray-500 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((date, di) => {
                  if (!date)
                    return <div key={`e-${wi}-${di}`} className="aspect-square" />
                  const assigned = assignments[date]
                  const isToday = date === today
                  const isPast = date < today
                  const dayNum = parseInt(date.split('-')[2])
                  return (
                    <div
                      key={date}
                      className={[
                        'aspect-square rounded-lg p-1.5 flex flex-col',
                        isToday
                          ? 'bg-amber-900/30 border border-amber-700/40'
                          : isPast
                            ? 'bg-gray-900/40'
                            : 'bg-gray-800',
                      ].join(' ')}
                    >
                      <span
                        className={`text-xs leading-none ${isPast ? 'text-gray-600' : 'text-gray-400'}`}
                      >
                        {dayNum}
                      </span>
                      {assigned && (
                        <span
                          className={`text-[10px] font-semibold leading-tight mt-auto truncate ${isPast ? 'text-gray-600' : 'text-amber-400'}`}
                        >
                          {assigned.split(' ')[0]}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
