import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — Flight Deck by Bottlerocket' }

export default function PrivacyPolicy() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <div className="mb-10">
        <Link href="/" className="text-sm text-forest/50 hover:text-forest/80 transition-colors">
          ← Flight Deck
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-forest-dark mb-2">Privacy Policy</h1>
      <p className="text-forest/50 text-sm mb-10">Last updated: June 28, 2026 · Bottlerocket Social Hall, Pittsburgh PA</p>

      <div className="prose prose-sm max-w-none space-y-8 text-forest/80">

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">1. Who We Are</h2>
          <p>
            Flight Deck is a staff scheduling tool operated by Bottlerocket Social Hall ("we," "us," or "our"),
            located in Pittsburgh, Pennsylvania. It is used exclusively by Bottlerocket employees and contractors
            to manage work schedules and availability.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">2. Information We Collect</h2>
          <p>We collect only what is necessary to operate the scheduling system:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Name</strong> — to identify you in the schedule</li>
            <li><strong>Phone number</strong> — to send you shift reminders and scheduling notifications via SMS</li>
            <li><strong>Availability and schedule data</strong> — dates you've marked as available or been assigned</li>
          </ul>
          <p className="mt-3">
            We do not collect payment information, location data, or any information beyond what is needed
            for scheduling purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">3. How We Use Your Information</h2>
          <p>Your information is used solely for:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Sending you SMS notifications about your shifts, schedule confirmations, and availability reminders</li>
            <li>Coordinating substitute coverage when a staff member requests time off</li>
            <li>Displaying your schedule within the app</li>
          </ul>
          <p className="mt-3">
            We do not use your information for marketing, advertising, or any purpose unrelated to your employment
            scheduling at Bottlerocket.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">4. SMS Messaging</h2>
          <p>
            If you provide a phone number, you consent to receive text messages from Bottlerocket Social Hall
            related to your work schedule. These messages are sent via Twilio. Message and data rates may apply.
          </p>
          <p className="mt-3">
            To opt out of SMS messages, reply <strong>STOP</strong> to any message or contact us at{' '}
            <a href="mailto:chris@bottlerocketpgh.com" className="text-rust hover:underline">
              chris@bottlerocketpgh.com
            </a>.
            For help, reply <strong>HELP</strong> or email us directly.
          </p>
          <p className="mt-3">
            See our <Link href="/sms-terms" className="text-rust hover:underline">SMS Terms & Conditions</Link> for full details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">5. Sharing Your Information</h2>
          <p>
            We do not sell, rent, or share your personal information with third parties for marketing or
            commercial purposes. Your phone number and opt-in data will never be shared with third parties
            for their own marketing use.
          </p>
          <p className="mt-3">
            We use the following service providers to operate this app, who process data on our behalf:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Supabase</strong> — database hosting</li>
            <li><strong>Vercel</strong> — application hosting</li>
            <li><strong>Twilio</strong> — SMS delivery</li>
          </ul>
          <p className="mt-3">
            Each provider is bound by their own privacy and security standards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">6. Data Retention</h2>
          <p>
            We retain your information for as long as you are an active staff member at Bottlerocket.
            If you leave, you may request deletion of your data by contacting us at{' '}
            <a href="mailto:chris@bottlerocketpgh.com" className="text-rust hover:underline">
              chris@bottlerocketpgh.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-forest-dark mb-2">7. Contact</h2>
          <p>
            Questions about this policy? Email{' '}
            <a href="mailto:chris@bottlerocketpgh.com" className="text-rust hover:underline">
              chris@bottlerocketpgh.com
            </a>.
          </p>
        </section>

      </div>
    </main>
  )
}
