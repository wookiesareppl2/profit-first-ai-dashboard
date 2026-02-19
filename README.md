# Profit First AI Dashboard

This project is now deployment-ready for GitHub + Vercel.

## What this includes

- `index.html`: Main frontend app (converted from your markdown experiment).
- `api/gemini.js`: Vercel serverless function proxy for Z.ai API calls.
- `.env.example`: Required environment variable template.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, click **Add New Project** and import that repo.
3. In project settings, add environment variable:
   - `ZAI_API_KEY` = your Z.ai API key
   - `ZAI_MODEL` = `glm-5` (optional)
4. Deploy.

## Local run (optional)

1. Install Vercel CLI: `npm i -g vercel`
2. Copy `.env.example` to `.env` and set a real key.
3. Start locally: `vercel dev`
4. Open `http://localhost:3000`
