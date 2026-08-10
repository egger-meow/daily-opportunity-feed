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

The daily ChatGPT task is the single scheduled content pipeline: it researches and analyzes the day's signals, writes the website JSON to `main`, and that commit triggers `pages.yml` to deploy GitHub Pages.

`daily-feed.yml` is retained only as a manual RSS fallback. It has no cron schedule and will not overwrite the GPT-generated daily briefing. Archive filenames use the Asia/Taipei calendar date.
