# Profit First AI Dashboard

This project is now deployment-ready for GitHub + Vercel.

## What this includes

- `index.html`: Main frontend app (converted from your markdown experiment).
- `api/gemini.js`: Serverless/local API proxy for Gemini API calls.
- `.env.example`: Required environment variable template.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, click **Add New Project** and import that repo.
3. In project settings, add environment variable:
   - `GEMINI_API_KEY` = your Google AI Studio API key
     - Fallback names also supported: `GOOGLE_API_KEY`, `AI_STUDIO_API_KEY`
   - `GEMINI_MODEL` = `gemini-2.0-flash` (optional)
4. Deploy.

## Local run (optional)

1. Copy `.env.example` to `.env` and set a real key.
2. Start local dev server: `pnpm dev`
3. Open `http://localhost:3000`

This local dev server does not deploy and does not modify your live Vercel project.

## Regional setup

- The dashboard is configured for South Africa context:
  - Currency formatting: `ZAR` (`en-ZA`)
  - AI guidance prompts: South Africa-focused wording (SARS/VAT-aware)
