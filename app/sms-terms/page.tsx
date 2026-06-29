import Link from 'next/link'

export const metadata = { title: 'SMS Terms & Conditions — Flight Deck by Bottlerocket' }

export default function SmsTerms() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/" className="text-sm text-forest/50 hover:text-forest/80 transition-colors">
          ← Flight Deck
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-forest-dark mb-2">SMS Terms & Conditions</h1>
      <p className="text-forest/50 text-sm mb-10">Last updated: June 28, 2026 · Bottlerocket Social Hall, Pittsburgh PA</p>

      <div className="space-y-8 text-forest/80">

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">Program Description</h2>
          <p>
            Bottlerocket Social Hall operates Flight Deck, a staff scheduling tool. By providing your
            phone number to your employer, you consent to receive SMS text messages related to your
            work schedule at Bottlerocket Social Hall.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">Types of Messages</h2>
          <p>You may receive the following types of messages:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>Shift reminders (sent 2 days before your scheduled shift)</li>
            <li>Schedule confirmations when your monthly schedule is published</li>
            <li>Monthly reminders to submit your availability</li>
            <li>Sub coverage requests when a coworker requests time off on a day you're available</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">Message Frequency</h2>
          <p>
            Message frequency varies based on your schedule and availability. You may receive up to
            a few messages per week during active scheduling periods. No marketing or promotional
            messages will be sent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">Costs</h2>
          <p>
            Message and data rates may apply depending on your mobile carrier plan. Bottlerocket
            Social Hall does not charge for SMS messages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">How to Opt Out</h2>
          <p>
            To stop receiving text messages, reply <strong>STOP</strong> to any message from us.
            You will receive a confirmation and no further messages will be sent to that number.
          </p>
          <p className="mt-2">
            You can also opt out by contacting us at{' '}
            <a href="mailto:chris@bottlerocketpgh.com" className="text-rust hover:underline">
              chris@bottlerocketpgh.com
            </a>{' '}
            or by asking your manager to remove your phone number from the system.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">How to Get Help</h2>
          <p>
            Reply <strong>HELP</strong> to any message for assistance, or email{' '}
            <a href="mailto:chris@bottlerocketpgh.com" className="text-rust hover:underline">
              chris@bottlerocketpgh.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">Supported Carriers</h2>
          <p className="text-sm">
            Messages are delivered via Twilio. Supported carriers include AT&T, Verizon, T-Mobile,
            Sprint, Boost Mobile, MetroPCS, U.S. Cellular, and others. Carrier support may vary.
            Carriers are not liable for delayed or undelivered messages.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">Privacy</h2>
          <p>
            Your phone number and opt-in data will not be shared with third parties for marketing
            purposes. See our full{' '}
            <Link href="/privacy" className="text-rust hover:underline">Privacy Policy</Link>{' '}
            for details on how we handle your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">Contact</h2>
          <p>
            Bottlerocket Social Hall · Pittsburgh, PA<br />
            <a href="mailto:chris@bottlerocketpgh.com" className="text-rust hover:underline">
              chris@bottlerocketpgh.com
            </a>
          </p>
        </section>

      </div>
    </main>
  )
}
