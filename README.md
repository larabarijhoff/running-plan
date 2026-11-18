# running-plan

**Running plans de Lara**: my training blocks, each built from my real Strava data, as a small static site with a Strava integration that tracks actual runs against the plan.

**Live:** [running-plan-ochre.vercel.app](https://running-plan-ochre.vercel.app)

## What's in it

- **`index.html`** — landing page. Shows the **current block** front and centre and the **history** of finished blocks (blurred cards, sharp on hover).
  - Current: **Bloque 02 · Cierre de temporada** — adidas 10K Night Run (28 Nov 2026) + Circuito de las Estaciones Verano 10K (20 Dec 2026). 5 weeks, 3 runs/week.
- **`21k-2026.html`** — archived **Bloque 01**: the 19-week plan for the Buenos Aires Half-Marathon 2026 (ran it in Santa Rosa, CA on 23 Aug 2026 · 2:13:29).
- **`guia_geles_lara_21k.html`** — gel/nutrition strategy page for the 21K.
- **`api/strava.js`** — Vercel serverless function: refresh-token → access token, fetches runs for a date window, returns compact JSON.

## Adding a new block

1. Copy the current block's sections in `index.html` into a new `<name>.html` and add an archive banner (see `21k-2026.html`).
2. Add a card for it in the **Historial** section (and the hero rail) of `index.html`.
3. Write the new block in `index.html` and point its Strava fetch at the new window: `/api/strava?since=YYYY-MM-DD`.

## Stack

- Vanilla **HTML / CSS / JavaScript** (no framework, no build step)
- **Vercel** static hosting + a single Node serverless function
- **Strava API** (OAuth2 refresh-token flow) for live activity sync
- Fonts: **Fraunces** (display) + **JetBrains Mono** (numerics) + **Inter Tight** (UI)
- Dark theme with a hand-tuned palette (`#d4ff3a` accent, subtle radial gradients, SVG grain overlay)

## Strava integration

Each page calls `/api/strava?since=YYYY-MM-DD[&until=YYYY-MM-DD]` (cached for 5 min via `s-maxage=300`), so every plan only shows runs from its own block. Without params it defaults to the 21K block start (2026-04-13). The function reads three env vars from Vercel:

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
