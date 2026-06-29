'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

export default function SubClaimPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<'loading' | 'ready' | 'claiming' | 'claimed' | 'already' | 'error'>('loading')
  const [info, setInfo] = useState<{ staffName: string; date: string } | null>(null)

  // Pre-fetch claim info to show the date before they tap
  useEffect(() => {
    fetch(`/api/sub?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setState('error'); return }
        if (d.status === 'claimed') { setState('already'); return }
        setInfo({ staffName: d.staff_name, date: d.date })
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [token])

  async function claim() {
    setState('claiming')
    const res = await fetch('/api/sub', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const d = await res.json()
    if (d.already) { setState('already'); return }
    if (!res.ok) { setState('error'); return }
    setInfo({ staffName: d.staffName, date: d.date })
    setState('claimed')
  }

  return (
    <main className="max-w-sm mx-auto pt-32 px-6 text-center">
      <p className="text-forest-dark font-bold tracking-tight">Flight Deck</p>
      <p className="text-forest/40 text-xs mb-8">a scheduling tool by Bottlerocket</p>

      {state === 'loading' && (
        <p className="text-forest/50">Loading…</p>
      )}

      {state === 'ready' && info && (
        <>
          <h1 className="text-xl font-bold mb-2 text-forest-dark">Sub Needed</h1>
          <p className="text-forest/60 mb-8">
            Can you cover the shift on{' '}
            <span className="font-semibold text-forest-dark">{fmtDate(info.date)}</span>?
          </p>
          <button
            onClick={claim}
            className="bg-rust hover:bg-rust-dark text-cream font-semibold px-8 py-3 rounded-xl transition-colors w-full"
          >
            Yes, I can cover this shift
          </button>
          <p className="text-forest/30 text-xs mt-4">The admin will be notified right away.</p>
        </>
      )}

      {state === 'claiming' && (
        <p className="text-forest/50">Confirming…</p>
      )}

      {state === 'claimed' && info && (
        <>
          <h1 className="text-xl font-bold mb-3 text-forest-dark">You're on it!</h1>
          <p className="text-forest/60">
            Got it — the admin has been notified that you can cover{' '}
            <span className="font-semibold text-forest-dark">{fmtDate(info.date)}</span>.
          </p>
        </>
      )}

      {state === 'already' && (
        <>
          <h1 className="text-xl font-bold mb-3 text-forest-dark">Already claimed</h1>
          <p className="text-forest/60">Someone already picked up this shift. Thanks for being willing!</p>
        </>
      )}

      {state === 'error' && (
        <>
          <h1 className="text-xl font-bold mb-3 text-forest-dark">Link expired</h1>
          <p className="text-forest/60">This link is no longer valid.</p>
        </>
      )}

      <a href="/" className="mt-10 inline-block text-sm text-forest/30 hover:text-forest/60 underline transition-colors">
        Back to Flight Deck
      </a>
    </main>
  )
}
