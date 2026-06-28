'use client'

import { useState, useEffect } from 'react'

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

function getMonthDays(month: string) {
  const [year, monthNum] = month.split('-').map(Number)
  const numDays = new Date(year, monthNum, 0).getDate()
  return Array.from({ length: numDays }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
}

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function SchedulePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const monthOptions = getMonthOptions()
  const today = new Date().toISOString().split('T')[0]

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

  const days = getMonthDays(month)

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <a href="/" className="text-gray-500 text-sm hover:text-gray-300 mb-6 inline-block">
        ← Back
      </a>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Schedule</h1>
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
        <div className="space-y-1">
          {days.map((date) => {
            const assigned = assignments[date]
            const isToday = date === today
            const isPast = date < today
            return (
              <div
                key={date}
                className={[
                  'flex items-center justify-between rounded-lg px-4 py-3',
                  isToday
                    ? 'bg-amber-900/30 border border-amber-700/40'
                    : isPast
                      ? 'bg-gray-900/60'
                      : 'bg-gray-800',
                ].join(' ')}
              >
                <span className={`text-sm ${isPast ? 'text-gray-500' : 'text-gray-200'}`}>
                  {fmtDate(date)}
                </span>
                <span
                  className={`text-sm font-medium ${
                    assigned
                      ? isPast
                        ? 'text-gray-500'
                        : 'text-amber-400'
                      : 'text-gray-700'
                  }`}
                >
                  {assigned ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
