import Link from 'next/link'

export default function Home() {
  return (
    <main className="max-w-sm mx-auto pt-24 px-6">
      <h1 className="text-2xl font-bold text-center mb-1">Bottlerocket Staff</h1>
      <p className="text-gray-500 text-sm text-center mb-12">Tech crew scheduling</p>
      <div className="flex flex-col gap-3">
        <Link
          href="/availability"
          className="bg-gray-800 hover:bg-gray-700 rounded-xl p-5 block transition-colors"
        >
          <div className="font-semibold">My Availability</div>
          <div className="text-gray-400 text-sm mt-0.5">Add or update your available dates</div>
        </Link>
        <Link
          href="/schedule"
          className="bg-gray-800 hover:bg-gray-700 rounded-xl p-5 block transition-colors"
        >
          <div className="font-semibold">Schedule</div>
          <div className="text-gray-400 text-sm mt-0.5">See who&apos;s working each night</div>
        </Link>
      </div>
    </main>
  )
}
