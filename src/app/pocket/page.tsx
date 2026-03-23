import Link from 'next/link';
import { BookmarkletLink } from './BookmarkletLink';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ridecast.app';

// Bookmarklet — single line, using APP_URL
const BOOKMARKLET = `javascript:(function(){var w=window.open('${APP_URL}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'ridecast_save','width=480,height=280,left='+(screen.width/2-240)+',top='+(screen.height/2-140));if(!w){location.href='${APP_URL}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title);}})()`

export default function PocketPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[#18181A]">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <circle cx="12" cy="12" r="9" opacity="0.3" />
              <polygon points="10,8 16,12 10,16" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Ridecast</span>
        </div>
        <Link href="/sign-up"
          className="px-4 py-2 rounded-[9px] bg-[#EA580C] text-white text-sm font-semibold">
          Get Started Free
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-20">

        {/* Hero */}
        <section className="pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EA580C]/15 border border-[#EA580C]/25 text-[#EA580C] text-xs font-medium mb-6">
            Pocket closed July 2025
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Your reading list,<br />
            <span className="bg-gradient-to-br from-[#EA580C] to-[#F97316] bg-clip-text text-transparent">
              finally heard
            </span>
          </h1>
          <p className="text-[var(--text-mid)] text-lg leading-relaxed max-w-md mx-auto mb-8">
            Ridecast turns your saved articles into AI-narrated podcast episodes. Stop saving to read later. Start listening on your commute.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up"
              className="px-7 py-3.5 rounded-[12px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white font-semibold text-[15px] shadow-[0_4px_20px_rgba(234,88,12,0.4)]">
              Start Free
            </Link>
            <a href="#import"
              className="px-7 py-3.5 rounded-[12px] bg-white border border-black/[0.09] font-semibold text-[15px]">
              Import from Pocket
            </a>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-14">
          <h2 className="text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider text-center mb-6">
            How it works
          </h2>
          <div className="grid gap-4">
            {[
              {
                step: '1',
                title: 'Import your Pocket list',
                desc: 'Download your Pocket export and upload it. Your entire reading history appears in Ridecast instantly.',
              },
              {
                step: '2',
                title: 'Pick an article',
                desc: 'Choose anything from your library. Set how long you want the episode — 5, 15, or 30 minutes.',
              },
              {
                step: '3',
                title: 'Listen on your commute',
                desc: 'Ridecast generates a natural-sounding audio episode. Play it anywhere — no headphone cord required.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-4 rounded-[12px] bg-white border border-black/[0.07]">
                <div className="w-8 h-8 rounded-full bg-[#EA580C]/20 text-[#EA580C] font-bold text-sm flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div>
                  <div className="font-semibold mb-0.5">{title}</div>
                  <div className="text-sm text-[var(--text-mid)] leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Import CTA */}
        <section id="import" className="pb-14 text-center">
          <div className="bg-gradient-to-br from-[#EA580C]/[0.08] to-[#F97316]/[0.06] border border-[#EA580C]/20 rounded-[16px] p-8">
            <h2 className="text-xl font-bold mb-2">Import your Pocket history</h2>
            <p className="text-[var(--text-mid)] text-sm mb-6">
              Create an account, then upload your Pocket export file (.html or .csv).
              Your full reading list will be waiting in your library.
            </p>
            <Link href="/sign-up"
              className="inline-block px-7 py-3.5 rounded-[12px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white font-semibold text-[15px] shadow-[0_4px_20px_rgba(234,88,12,0.35)]">
              Create Free Account &amp; Import
            </Link>
          </div>
        </section>

        {/* Bookmarklet */}
        <section className="pb-14">
          <h2 className="text-lg font-bold mb-2">Replace your Pocket button</h2>
          <p className="text-[var(--text-mid)] text-sm mb-5">
            Drag this to your bookmark bar. One click from any article saves it to Ridecast — just like Pocket did.
          </p>

          {/* Draggable bookmarklet link */}
          <div className="flex items-center gap-3 p-4 rounded-[12px] bg-white border border-black/[0.09] border-dashed">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <circle cx="12" cy="12" r="9" opacity="0.3" />
                <polygon points="10,8 16,12 10,16" />
              </svg>
            </div>
            <BookmarkletLink href={BOOKMARKLET} />
            <span className="text-[11px] text-[var(--text-dim)]">← drag to bookmarks bar</span>
          </div>

          <p className="text-xs text-[var(--text-dim)] mt-3 text-center">
            Requires signing in to Ridecast first. Works in Chrome, Firefox, Safari, and Edge.
          </p>
        </section>

        {/* Pricing */}
        <section className="pb-6 text-center">
          <h2 className="text-lg font-bold mb-4">Simple pricing</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-[14px] bg-white border border-black/[0.07] text-left">
              <div className="font-bold mb-1">Free</div>
              <div className="text-2xl font-extrabold mb-3">$0</div>
              <ul className="space-y-1.5 text-sm text-[var(--text-mid)]">
                <li>✓ Import your Pocket library</li>
                <li>✓ Save articles via bookmarklet</li>
                <li>✓ Browse the Ridecast catalog</li>
              </ul>
            </div>
            <div className="p-5 rounded-[14px] bg-gradient-to-br from-[#EA580C]/[0.1] to-[#F97316]/[0.08] border border-[#EA580C]/30 text-left">
              <div className="font-bold mb-1">Pro</div>
              <div className="text-2xl font-extrabold mb-3">$10<span className="text-base font-normal text-[var(--text-dim)]">/mo</span></div>
              <ul className="space-y-1.5 text-sm text-[var(--text-mid)]">
                <li>✓ Convert any article to audio</li>
                <li>✓ Custom episode lengths</li>
                <li>✓ Your full Pocket library, heard</li>
              </ul>
              <Link href="/upgrade"
                className="mt-4 block text-center py-2.5 rounded-[10px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white text-sm font-semibold">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
