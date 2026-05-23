// Vercel serverless function: /api/strava
// Returns running activities since training start (Apr 14, 2026).
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

  // Fetch activities since training start: Apr 13 2026 (one day early to cover BA timezone)
  const after = Math.floor(new Date('2026-04-13T00:00:00Z').getTime() / 1000);

  const activitiesRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=100&after=${after}`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  if (!activitiesRes.ok) {
    return res.status(502).json({ error: 'strava_api_failed' });
  }

  const all = await activitiesRes.json();

  const runs = all
    .filter(a => a.type === 'Run' || a.sport_type === 'Run')
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
