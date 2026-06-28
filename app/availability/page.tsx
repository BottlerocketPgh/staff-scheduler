'use client'

import { useState, useEffect, useRef } from 'react'

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    options.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    })
  }
  return options
}

function getCalendarDays(month: string): (string | null)[] {
  const [year, monthNum] = month.split('-').map(Number)
  const firstDow = new Date(year, monthNum - 1, 1).getDay()
  const numDays = new Date(year, monthNum, 0).getDate()
  const days: (string | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= numDays; d++) {
    days.push(`${month}-${String(d).padStart(2, '0')}`)
  }
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function AvailabilityPage() {
  const [nameInput, setNameInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedName, setConfirmedName] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [loadingDates, setLoadingDates] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
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
    if (!confirmedName || !month) return
    setLoadingDates(true)
    setIsSubmitted(false)
    Promise.all([
      fetch(`/api/availability?name=${encodeURIComponent(confirmedName)}&month=${month}`).then(r => r.json()),
      fetch(`/api/availability/submit?name=${encodeURIComponent(confirmedName)}&month=${month}`).then(r => r.json()),
    ])
      .then(([dates, sub]) => {
        setSelectedDates(new Set(dates as string[]))
        setIsSubmitted((sub as { submitted: boolean }).submitted)
      })
      .finally(() => setLoadingDates(false))
  }, [confirmedName, month])

  async function confirmName(raw: string) {
    const n = raw.trim()
    if (!n) return
    setConfirming(true)
    setShowSuggestions(false)
    setSuggestions([])
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n }),
    })
    const data = await res.json()
    const canonical: string = data.name ?? n
    setNameInput(canonical)
    setConfirmedName(canonical)
    setConfirming(false)
  }

  async function toggleDate(date: string) {
    if (toggling || isSubmitted) return
    const removing = selectedDates.has(date)
    setToggling(date)
    const next = new Set(selectedDates)
    removing ? next.delete(date) : next.add(date)
    setSelectedDates(next)
    const res = await fetch('/api/availability', {
      method: removing ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: confirmedName, date }),
    })
    if (!res.ok) setSelectedDates(selectedDates)
    setToggling(null)
  }

  async function submitAvailability() {
    setSubmitting(true)
    await fetch('/api/availability/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: confirmedName, month }),
    })
    setIsSubmitted(true)
    setSubmitting(false)
  }

  const days = confirmedName ? getCalendarDays(month) : []

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <a href="/" className="text-gray-500 text-sm hover:text-gray-300 mb-6 inline-block">
        ← Back
      </a>
      <h1 className="text-xl font-bold mb-6">My Availability</h1>

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
                onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) confirmName(nameInput) }}
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
            disabled={!nameInput.trim() || confirming}
            onClick={() => confirmName(nameInput)}
          >
            {confirming ? 'Loading...' : 'Continue'}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="text-gray-200 font-medium">{confirmedName}</span>
              <button
                className="text-xs text-gray-500 hover:text-gray-300 underline"
                onClick={() => { setConfirmedName(''); setNameInput(''); setSelectedDates(new Set()); setIsSubmitted(false) }}
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

          {/* Submitted banner */}
          {isSubmitted && (
            <div className="bg-green-900/30 border border-green-700/40 rounded-lg px-4 py-3 mb-4 text-sm text-green-300">
              ✓ Availability submitted for {monthLabel(month)}. Your dates are locked until the schedule is published.
            </div>
          )}

          {loadingDates ? (
            <div className="text-gray-500 text-center py-12">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <div key={d} className="text-center text-xs text-gray-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((date, i) => {
                  if (!date) return <div key={`blank-${i}`} />
                  const active = selectedDates.has(date)
                  const busy = toggling === date
                  return (
                    <button
                      key={date}
                      onClick={() => toggleDate(date)}
                      disabled={!!toggling || isSubmitted}
                      className={[
                        'aspect-square rounded-lg text-sm font-medium transition-colors',
                        active
                          ? isSubmitted
                            ? 'bg-green-800/60 text-green-200 cursor-default'
                            : 'bg-amber-600 text-white hover:bg-amber-500'
                          : isSubmitted
                            ? 'bg-gray-900/40 text-gray-600 cursor-default'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
                        busy ? 'opacity-50' : '',
                        'disabled:cursor-default',
                      ].join(' ')}
                    >
                      {parseInt(date.split('-')[2])}
                    </button>
                  )
                })}
              </div>

              {!isSubmitted && (
                <div className="mt-6 space-y-2">
                  <button
                    onClick={submitAvailability}
                    disabled={submitting || selectedDates.size === 0}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-semibold disabled:opacity-40 transition-colors"
                  >
                    {submitting ? 'Submitting...' : `Submit availability for ${monthLabel(month)}`}
                  </button>
                  <p className="text-xs text-gray-600 text-center">
                    Locks your dates until the schedule is published.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}
