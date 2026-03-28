import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Ridecast",
  description: "How Ridecast handles your data",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-gray-100 bg-[#0F0F1A] min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-400 mb-10">Last updated: March 27, 2026</p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">What Ridecast Does</h2>
          <p>
            Ridecast transforms content you provide — URLs, PDFs, documents, and
            text — into audio episodes using AI. This policy explains what data
            we collect, how we use it, and your rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Data We Collect</h2>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Account Information</h3>
          <p>
            When you sign up, we collect your email address and name through our
            authentication provider (Clerk). This is used to identify your account
            and sync your episodes across devices.
          </p>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Content You Submit</h3>
          <p>
            When you create an episode, we process the content you provide (URL,
            document, or text). The content is sent to AI services for script
            generation and audio production. Generated audio files are stored in
            cloud storage associated with your account.
          </p>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Usage Data</h3>
          <p>
            We collect basic usage information to improve the app: which features
            you use, episode generation success/failure rates, and playback
            patterns. We do not track your location.
          </p>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Crash Reports</h3>
          <p>
            If the app crashes, Sentry (our error monitoring service) collects
            diagnostic information including device type, OS version, and the
            technical state at the time of the crash. This helps us fix bugs.
          </p>

          <h3 className="text-lg font-medium text-gray-200 mt-4 mb-2">Payment Information</h3>
          <p>
            If you subscribe to a paid plan, payment is processed by Stripe. We
            never see or store your credit card number. Stripe handles all payment
            data under their own{" "}
            <a
              href="https://stripe.com/privacy"
              className="text-[#FF6B35] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              privacy policy
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            How We Use Your Data
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Process your content into audio episodes</li>
            <li>Store and sync your episode library</li>
            <li>Authenticate your account</li>
            <li>Process payments (via Stripe)</li>
            <li>Fix bugs and improve the app</li>
          </ul>
          <p className="mt-3">
            We do not sell your data. We do not use your content for AI training.
            Your submitted content is used solely to generate your requested audio
            episodes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            Third-Party Services
          </h2>
          <p className="mb-3">
            Ridecast uses the following services to operate:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Clerk</strong> — Authentication (email, account management)
            </li>
            <li>
              <strong>Anthropic (Claude)</strong> — AI script generation from your
              content
            </li>
            <li>
              <strong>OpenAI / Google Cloud / ElevenLabs</strong> — Text-to-speech
              audio generation
            </li>
            <li>
              <strong>Microsoft Azure</strong> — Cloud hosting and file storage
            </li>
            <li>
              <strong>Stripe</strong> — Payment processing
            </li>
            <li>
              <strong>Sentry</strong> — Crash reporting and error monitoring
            </li>
          </ul>
          <p className="mt-3">
            Each service processes data under their own privacy policies. We share
            only the minimum data required for each service to function.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            Data Storage and Security
          </h2>
          <p>
            Your data is stored on Microsoft Azure servers in the United States.
            Audio files are stored in Azure Blob Storage. We use HTTPS for all
            data transmission and follow standard security practices for data at
            rest.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            Your Rights
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Delete your account</strong> — Contact us and we will delete
              your account and all associated data.
            </li>
            <li>
              <strong>Delete your content</strong> — You can delete individual
              episodes from the app at any time. Deleted episodes are removed from
              our servers.
            </li>
            <li>
              <strong>Export your data</strong> — Contact us for a copy of your
              data.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            Children&apos;s Privacy
          </h2>
          <p>
            Ridecast is not directed at children under 13. We do not knowingly
            collect data from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            Changes to This Policy
          </h2>
          <p>
            We may update this policy from time to time. We will notify you of
            significant changes through the app or by email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
          <p>
            Questions about this policy? Reach us at{" "}
            <a
              href="https://github.com/cpark4x/ridecast-support/issues"
              className="text-[#FF6B35] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/cpark4x/ridecast-support
            </a>
            {" "}or email{" "}
            <a
              href="mailto:chris.park@gmail.com"
              className="text-[#FF6B35] underline"
            >
              chris.park@gmail.com
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}