# ridecast2

You have a 45-minute commute and 12 tabs you'll never read.

Ridecast turns them into audio you can actually get through — on the train, in the car, on a walk. Paste in a link, drop in a PDF, hand it a document. Get back a podcast episode, ready to play.

---

## How it works

**1. Give it something to read**
Drop in a URL, PDF, article, or document. Ridecast pulls out the content — no copy-paste required.

**2. It writes and records the episode**
AI condenses and scripts the material for listening, then narrates it. Not a robot reading words at you — formatted for audio, paced for a commute.

**3. Listen**
Your episode is ready. Play it, download it, or queue it up. Your commute now has a point.

---

## What you can throw at it

- Web pages and articles (any URL)
- PDFs
- Word documents and text files
- Raw text — paste anything

---

## Stack

Next.js 16 · React 19 · Prisma + PostgreSQL · Anthropic + OpenAI APIs · Docker

---

## Quick start

**Prerequisites:** Node.js 18+, PostgreSQL, API keys for Anthropic and OpenAI.

```bash
# 1. Clone and install
git clone https://github.com/chrispark/ridecast2.git
cd ridecast2
npm install

# 2. Set up environment
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY, OPENAI_API_KEY, and DATABASE_URL

# 3. Set up the database
npx prisma migrate dev

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Using Docker:**
```bash
docker compose up
```

---

## Tests

```bash
npm run test          # unit tests (Vitest)
npm run test:e2e      # end-to-end tests (Playwright)
```

---

## Status

Active development. Core pipeline works — input extraction, AI scripting, audio generation, episode storage. Rough edges exist.

---

## Built by

**Chris Park** — Senior PM at Microsoft's Office of the CTO, AI Incubation group. Engineering degree from Waterloo. 17 years shipping product.

Ridecast is a personal project: a practitioner learning by building, not just speccing. The goal was to close the gap between "things I want to know" and "time I actually have."

---

*If you have a commute and a reading list, you know exactly what this is for.*
