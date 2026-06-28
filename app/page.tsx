import Link from 'next/link'

export default function Home() {
  return (
    <main className="max-w-sm mx-auto pt-24 px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-cream">FlightDeck</h1>
        <p className="text-cream/50 text-sm mt-1">by Bottlerocket</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/availability" className="bg-forest hover:bg-forest-light rounded-xl p-5 block transition-colors border border-forest-light/30">
          <div className="font-semibold text-cream">My Availability</div>
          <div className="text-cream/50 text-sm mt-0.5">Add or update your available dates</div>
        </Link>
        <Link href="/my-schedule" className="bg-forest hover:bg-forest-light rounded-xl p-5 block transition-colors border border-forest-light/30">
          <div className="font-semibold text-cream">My Schedule</div>
          <div className="text-cream/50 text-sm mt-0.5">View your shifts and request time off</div>
        </Link>
        <Link href="/schedule" className="bg-forest hover:bg-forest-light rounded-xl p-5 block transition-colors border border-forest-light/30">
          <div className="font-semibold text-cream">Schedule</div>
          <div className="text-cream/50 text-sm mt-0.5">See who&apos;s working each night</div>
        </Link>
      </div>
    </main>
  )
}
