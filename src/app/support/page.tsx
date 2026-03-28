import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Ridecast",
  description: "Get help with Ridecast",
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-gray-100 bg-[#0F0F1A] min-h-screen">
      <h1 className="text-3xl font-bold mb-2">Support</h1>
      <p className="text-gray-400 mb-10">
        We&apos;re here to help you get the most out of Ridecast.
      </p>

      <div className="space-y-8 text-gray-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            Common Questions
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-200">
                How do I create an episode?
              </h3>
              <p className="mt-1">
                Tap the + button on the home screen, paste a URL or upload a
                document, choose your duration, and tap Create. Your episode will
                be ready in 1-3 minutes.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-200">
                What content can I turn into audio?
              </h3>
              <p className="mt-1">
                URLs (articles, blog posts), PDFs, Word documents (.docx), Markdown
                files, and plain text. Just paste a link or upload a file.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-200">
                Can I listen offline?
              </h3>
              <p className="mt-1">
                Yes. Episodes are automatically downloaded for offline listening.
                You can manage downloads in Settings.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-200">
                How do I delete an episode?
              </h3>
              <p className="mt-1">
                In your Library, swipe left on an episode and tap Delete. This
                removes it from your device and our servers.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-200">
                My episode didn&apos;t generate correctly
              </h3>
              <p className="mt-1">
                Some content (paywalled articles, dynamically-loaded pages) may not
                extract fully. Try pasting the text directly instead of using the
                URL. If the issue persists, contact us below.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            Contact Us
          </h2>
          <p className="mb-4">
            Can&apos;t find what you need? Reach out directly:
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="https://github.com/cpark4x/ridecast-support/issues/new/choose"
              className="inline-block px-6 py-3 bg-[#FF6B35] text-white text-center font-semibold rounded-lg hover:bg-[#e55f2e] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an Issue
            </a>
            <a
              href="mailto:chris.park@gmail.com"
              className="inline-block px-6 py-3 bg-[#242438] text-white text-center font-semibold rounded-lg hover:bg-[#2e2e48] transition-colors"
            >
              Email Us
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            We typically respond within 24 hours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">
            App Version
          </h2>
          <p>
            Running into a bug? Include your app version (found in Settings) and a
            description of the issue when you contact us.
          </p>
        </section>
      </div>
    </main>
  );
}