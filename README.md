# running-plan

A personal training plan for the **Buenos Aires Half-Marathon 2026** (21K, 23 Aug 2026), built as a single static page with a Strava integration that pulls my actual runs and tracks weekly progress against the plan.

**Live:** [running-plan-ochre.vercel.app](https://running-plan-ochre.vercel.app)

## What's in it

- **`index.html`** — the training plan itself: week-by-week schedule, target paces, nutrition timeline, weekly progress vs Strava, countdown to race day.
- **`guia_geles_lara_21k.html`** — a separate gel/nutrition strategy page for the race.
- **`api/strava.js`** — a Vercel serverless function that exchanges the refresh token for an access token, fetches runs since the training start date, and returns a compact JSON the frontend reads to show actual vs planned progress.

## Stack

- Vanilla **HTML / CSS / JavaScript** (no framework, no build step)
- **Vercel** static hosting + a single Node serverless function
- **Strava API** (OAuth2 refresh-token flow) for live activity sync
- Fonts: **Fraunces** (display) + **JetBrains Mono** (numerics) + **Inter Tight** (UI)
- Dark theme with a hand-tuned palette (`#d4ff3a` accent, subtle radial gradients, SVG grain overlay)

## Strava integration

The frontend calls `/api/strava` (cached for 5 min via `s-maxage=300`). The function reads three env vars from Vercel:

```
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_REFRESH_TOKEN
```

If any are missing it returns `503 strava_not_configured` and the page falls back gracefully. See the docstring at the top of [`api/strava.js`](api/strava.js) for the one-time OAuth flow to obtain the refresh token.

## Local preview

It's plain HTML — open `index.html` in a browser, or:

```bash
npx serve .
```

The Strava section will show "not configured" locally unless you also run `vercel dev` with the env vars set.
