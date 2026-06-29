'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

export default function EnrollPage() {
  const [nameInput, setNameInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmedName, setConfirmedName] = useState('')
  const [phone, setPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!nameInput.trim() || confirmedName) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/staff?q=${encodeURIComponent(nameInput)}`)
      setSuggestions(await res.json())
    }, 200)
  }, [nameInput, confirmedName])

  function confirmName(n: string) {
    setNameInput(n)
    setConfirmedName(n)
    setShowSuggestions(false)
    setSuggestions([])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: confirmedName, phone }),
    })
    if (res.ok) {
      setDone(true)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Something went wrong. Try again.')
    }
    setSubmitting(false)
  }

  const canSubmit = confirmedName && phone.replace(/\D/g, '').length >= 10 && agreed && !submitting

  if (done) {
    return (
      <main className="max-w-sm mx-auto px-6 py-20 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h1 className="text-xl font-bold text-forest-dark mb-2">You're enrolled</h1>
        <p className="text-forest/60 text-sm">Check your phone — a confirmation message is on its way.</p>
        <Link href="/" className="inline-block mt-8 text-sm text-forest/40 hover:text-forest/70 transition-colors">← Flight Deck</Link>
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <Link href="/" className="text-sm text-forest/50 hover:text-forest/80 transition-colors">← Flight Deck</Link>

      <h1 className="text-2xl font-bold text-forest-dark mt-8 mb-1">SMS Enrollment</h1>
      <p className="text-forest/50 text-sm mb-8">Sign up to receive shift scheduling notifications from Bottlerocket Social Hall.</p>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-sm text-forest/60 mb-1.5">Your name</label>
          <div className="relative">
            <input
              className="w-full bg-white border border-forest/20 rounded-lg px-4 py-2.5 text-forest-dark outline-none focus:ring-2 focus:ring-rust placeholder-forest/30"
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setConfirmedName(''); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Start typing your name..."
              autoComplete="off"
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

        <div>
          <label className="block text-sm text-forest/60 mb-1.5">Mobile phone number</label>
          <input
            type="tel"
            className="w-full bg-white border border-forest/20 rounded-lg px-4 py-2.5 text-forest-dark outline-none focus:ring-2 focus:ring-rust placeholder-forest/30"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="412-555-1234"
            autoComplete="tel"
          />
        </div>

        <div className="bg-white border border-forest/15 rounded-xl p-4">
          <label className="flex gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-rust shrink-0"
            />
            <span className="text-sm text-forest/70 leading-relaxed">
              I agree to receive shift scheduling SMS notifications from Bottlerocket Social Hall. Message frequency varies. Message & data rates may apply. Reply <strong>STOP</strong> to opt out at any time. Reply <strong>HELP</strong> for help.{' '}
              <Link href="/sms-terms" className="text-rust hover:underline">SMS Terms</Link> ·{' '}
              <Link href="/privacy" className="text-rust hover:underline">Privacy Policy</Link>
            </span>
          </label>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-rust hover:bg-rust-dark text-cream py-2.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Enrolling...' : 'Enroll'}
        </button>
      </form>

      <p className="text-xs text-forest/30 text-center mt-6">
        Bottlerocket Social Hall · Pittsburgh, PA · <a href="mailto:chris@bottlerocketpgh.com" className="hover:text-forest/50">chris@bottlerocketpgh.com</a>
      </p>
    </main>
  )
}
