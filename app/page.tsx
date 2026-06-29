import Link from 'next/link'

export default function Home() {
  return (
    <main className="max-w-sm mx-auto pt-24 px-6">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-forest-dark">Flight Deck</h1>
        <p className="text-forest/50 text-sm mt-1">a scheduling tool by Bottlerocket</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/availability" className="bg-white hover:bg-forest/8 rounded-xl p-5 block transition-colors border border-forest/10">
          <div className="font-semibold text-forest-dark">My Availability</div>
          <div className="text-forest/50 text-sm mt-0.5">Add or update your available dates</div>
        </Link>
        <Link href="/my-schedule" className="bg-white hover:bg-forest/8 rounded-xl p-5 block transition-colors border border-forest/10">
          <div className="font-semibold text-forest-dark">My Schedule</div>
          <div className="text-forest/50 text-sm mt-0.5">View your shifts and request time off</div>
        </Link>
        <Link href="/schedule" className="bg-white hover:bg-forest/8 rounded-xl p-5 block transition-colors border border-forest/10">
          <div className="font-semibold text-forest-dark">Schedule</div>
          <div className="text-forest/50 text-sm mt-0.5">See who&apos;s working each night</div>
        </Link>
      </div>
      <div className="mt-8 text-center">
        <Link href="/admin" className="text-xs text-forest/30 hover:text-forest/60 transition-colors">
          Admin login
        </Link>
      </div>
      <div className="mt-6 text-center flex justify-center gap-4">
        <Link href="/privacy" className="text-xs text-forest/25 hover:text-forest/50 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/sms-terms" className="text-xs text-forest/25 hover:text-forest/50 transition-colors">
          SMS Terms
        </Link>
      </div>
    </main>
  )
}
