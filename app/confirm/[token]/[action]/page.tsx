import { supabase } from '@/lib/supabase'

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
}

function Result({ title, message }: { title: string; message: string }) {
  return (
    <main className="max-w-sm mx-auto pt-32 px-6 text-center">
      <p className="text-cream/40 text-xs mb-8 tracking-widest uppercase">FlightDeck · Bottlerocket</p>
      <h1 className="text-xl font-bold mb-3 text-cream">{title}</h1>
      <p className="text-cream/60">{message}</p>
      <a href="/" className="mt-10 inline-block text-sm text-cream/30 hover:text-cream/60 underline transition-colors">
        Back to FlightDeck
      </a>
    </main>
  )
}

export default async function ConfirmPage({ params }: { params: { token: string; action: string } }) {
  const { token, action } = params

  if (action !== 'yes' && action !== 'no') {
    return <Result title="Invalid link" message="This link doesn't look right." />
  }

  const { data } = await supabase
    .from('shift_confirmations')
    .select('*')
    .eq('token', token)
    .single()

  if (!data) {
    return <Result title="Link expired" message="This link is no longer valid." />
  }

  if (data.status !== 'pending') {
    const verb = data.status === 'confirmed' ? 'confirmed' : 'cancelled'
    return <Result title="Already responded" message={`You already ${verb} your shift for ${fmtDate(data.date)}.`} />
  }

  const status = action === 'yes' ? 'confirmed' : 'cancelled'
  await supabase
    .from('shift_confirmations')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('token', token)

  if (status === 'confirmed') {
    return <Result title="You're confirmed ✓" message={`See you at Bottlerocket on ${fmtDate(data.date)}!`} />
  }

  return <Result title="Shift cancelled" message={`Got it — we'll find someone else for ${fmtDate(data.date)}.`} />
}
