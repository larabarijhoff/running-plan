// Vercel serverless function: /api/strava
// Returns running activities for a training block.
//
// Query params (both optional, YYYY-MM-DD, interpreted in local race time):
//   ?since=2026-11-16   first day to include (default: 2026-04-13, start of the 21K block)
//   ?until=2026-12-20   last day to include  (default: no upper bound)
// Each plan page asks for its own window, so the archived 21K plan keeps
// showing only its block and the current plan only shows the new one.
//
// Required env vars (set in Vercel dashboard):
//   STRAVA_CLIENT_ID
//   STRAVA_CLIENT_SECRET
//   STRAVA_REFRESH_TOKEN
//
// One-time setup to get the refresh token:
// 1. Go to https://www.strava.com/settings/api → note Client ID & Secret
// 2. Visit in browser (replace YOUR_CLIENT_ID):
//    https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost&response_type=code&scope=activity:read_all
// 3. Authorize → copy the `code` from the redirect URL
// 4. Run in terminal:
//    curl -X POST https://www.strava.com/oauth/token \
//      -d client_id=YOUR_CLIENT_ID \
//      -d client_secret=YOUR_CLIENT_SECRET \
//      -d code=THE_CODE \
//      -d grant_type=authorization_code
// 5. Copy `refresh_token` from the JSON response → set as STRAVA_REFRESH_TOKEN

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    return res.status(503).json({ error: 'strava_not_configured' });
  }

  // Exchange refresh token for access token
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: STRAVA_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenRes.ok) {
    return res.status(502).json({ error: 'token_refresh_failed' });
  }

  const { access_token } = await tokenRes.json();

  // Date window from query params (validated); defaults keep the 21K plan's behaviour
  const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const q = req.query || {};
  const since = isDay(q.since) ? q.since : '2026-04-13';
  const until = isDay(q.until) ? q.until : null;

  // Pad the epoch window by a day on each side to cover the BA timezone;
  // the exact cut is done below on start_date_local.
  const DAY = 86400;
  const after = Math.floor(new Date(`${since}T00:00:00Z`).getTime() / 1000) - DAY;
  const before = until ? Math.floor(new Date(`${until}T23:59:59Z`).getTime() / 1000) + DAY : null;

  // Page through results (Strava caps per_page at 200); 4 pages is plenty for one block
  const all = [];
  for (let page = 1; page <= 4; page++) {
    const url = `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}&after=${after}` +
      (before ? `&before=${before}` : '');
    const activitiesRes = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!activitiesRes.ok) {
      return res.status(502).json({ error: 'strava_api_failed' });
    }
    const batch = await activitiesRes.json();
    all.push(...batch);
    if (batch.length < 200) break;
  }

  const runs = all
    .filter(a => a.type === 'Run' || a.sport_type === 'Run')
    .filter(a => {
      const day = a.start_date_local.split('T')[0];
      return day >= since && (!until || day <= until);
    })
    .map(a => ({
      id: a.id,
      name: a.name,
      date: a.start_date_local.split('T')[0],
      distance_km: Math.round(a.distance) / 1000,
      moving_time_s: a.moving_time,
      avg_speed_ms: a.average_speed,
      avg_hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      max_hr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
      elevation_m: Math.round(a.total_elevation_gain),
    }));

  return res.status(200).json({ runs });
};
