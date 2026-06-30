'use client'

import { useState } from 'react'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  return raw
}

export default function EnrollPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      if (data.error === 'already_registered') {
        setError("You're already registered. If you need to update your number, contact your manager.")
      } else {
        setError(data.error ?? 'Something went wrong. Try again.')
      }
      return
    }

    setSuccess(data.name)
  }

  if (success) {
    return (
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-forest-dark mb-2">You're almost in, {success}.</h1>
          <p className="text-forest/60 text-sm leading-relaxed">
            Check your phone — we just sent you a text. Reply <strong>YES</strong> to confirm your number and activate your account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forest-dark mb-1">Flight Deck</h1>
        <p className="text-forest/50 text-sm">Bottlerocket Social Hall · Shift Scheduling</p>
      </div>

      <div className="space-y-4 text-sm text-forest/70 mb-8 leading-relaxed">
        <p>
          Flight Deck is how we manage the tech schedule at Bottlerocket. Once you're set up, you'll get a text when your schedule is ready each month, a reminder the day before each show, and the ability to request time off or pick up subs.
        </p>
        <p>
          Enter your name and phone number below to get started. You'll receive a confirmation text — reply <strong>YES</strong> to activate.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-forest/60 mb-1.5">Your name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="First Last"
            required
            className="w-full bg-white border border-forest/20 rounded-lg px-4 py-2.5 text-forest-dark outline-none focus:ring-2 focus:ring-rust placeholder-forest/30"
          />
        </div>

        <div>
          <label className="block text-sm text-forest/60 mb-1.5">Mobile number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(412) 555-0100"
            required
            className="w-full bg-white border border-forest/20 rounded-lg px-4 py-2.5 text-forest-dark outline-none focus:ring-2 focus:ring-rust placeholder-forest/30"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !name.trim() || !phone.trim()}
          className="w-full bg-rust hover:bg-rust-dark text-cream py-2.5 rounded-lg font-medium disabled:opacity-40 transition-colors"
        >
          {submitting ? 'Sending…' : 'Get started'}
        </button>

        <p className="text-xs text-forest/40 text-center leading-relaxed">
          By submitting you agree to receive text messages about your shifts at Bottlerocket. Message & data rates may apply. Reply STOP at any time to opt out.
        </p>
      </form>
    </main>
  )
}
