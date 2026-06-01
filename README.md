# Shriram AMC Voice Chatbot

Voice assistant for Shriram AMC with multilingual support, page context awareness, and answers grounded in **Month_End_NAV.xlsx** (NAV + historical fund performance).

## Features

- Real-time voice via Gemini Live API
- Answers NAV and **past fund performance** (returns, CAGR, year-wise growth) from month-end NAV data
- Multilingual: replies in the language the user speaks
- Context-aware when embedded on the Shriram website (parent page URL/title)
- Deployable on **Vercel** (static app + serverless API routes)

## Prerequisites

- Node.js 18+
- [Gemini API key](https://aistudio.google.com/apikey)
- `Month_End_NAV.xlsx` in the project root

## Setup

```bash
npm install
cp .env.example .env
# Add GEMINI_API_KEY to .env
npm run build:data
```

`build:data` reads `Month_End_NAV.xlsx` and generates:

- `data/nav-records.json` — all NAV rows
- `data/fund-performance-summary.json` — per-fund returns & CAGR
- `data/fund-catalog.json` — fund name list

## Run locally

```bash
npm run dev
```

This starts:

- **API** on http://localhost:3000 (`/api/live-token`, `/api/tools`, …)
- **Vite** on http://localhost:5173 — **open this URL in the browser**

Use **Initiate voice chat** on port **5173**. If you only run `vite`, the API will be missing and voice will not start.

Optional:

```bash
npm run dev:api    # API only (port 3000)
npm run dev:vite   # frontend only (port 5173) — needs dev:api in another terminal
npm run dev:vercel # Vercel CLI instead of local API
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. **Environment variable:** `GEMINI_API_KEY` = your Gemini API key.
4. Build command: `npm run build:web` (set automatically via `vercel.json`).
5. Deploy.

The voice bot uses:

- `POST /api/live-token` — secure ephemeral token for Gemini Live
- `POST /api/tools` — NAV & performance lookups from Excel-derived data
- `POST /api/chat` — text chat (optional)

### Embed on your website

Add to your site:

```html
<script src="https://YOUR-VERCEL-URL/embed.js"></script>
```

## Ask the bot

Examples users can say (in any language):

- “What is the NAV of Shriram Flexi Cap Fund Regular Growth for December 2025?”
- “How did Shriram ELSS Tax Saver Fund perform over the last 3 years?”
- “Compare returns of aggressive hybrid regular growth”
- “Which Shriram fund had the best performance?”

Data is sourced only from `Month_End_NAV.xlsx` (via tools). The bot does not invent NAV or return figures.

## Update NAV data

Replace `Month_End_NAV.xlsx`, then:

```bash
npm run build:data
```

Redeploy to Vercel (or restart local dev).
