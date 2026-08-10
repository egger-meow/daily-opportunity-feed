# Daily Opportunity Feed

JJMOW's lightweight daily radar for AI releases, new technologies, unusual applications, developer tools, and business opportunities.

## What it does

- Collects fresh posts from official AI labs, open-source communities, developer infrastructure, Product Hunt, and Hacker News.
- Scores them around agents, LLMs, SaaS, crypto/trading infrastructure, education, video, mobile, and applied research.
- Turns every link into a practical prompt: why it matters, the opportunity, and a 15–60 minute next action.
- Keeps dated JSON archives and serves a fast static site through GitHub Pages.
- Saves favorites locally in the browser; no account or database required.

## Run locally

```bash
npm test
npm run generate
python -m http.server 8000
```

Open `http://localhost:8000`. A local server is required because browsers normally block `fetch()` from `file://`.

## Automation

`daily-feed.yml` runs at 07:15 Asia/Taipei every day and commits a fresh feed. It can also run manually from Actions. `pages.yml` deploys whenever `main` changes.

No API key is required for v1. A future LLM enrichment step can be added behind an optional secret without changing the site or data format.
