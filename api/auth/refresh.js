// api/auth/refresh.js
// Called by the frontend when the access token is about to expire.
// Reads the refresh token from the httpOnly cookie and returns a new access token.
// The refresh token itself is never exposed to the browser.

export default async function handler(req, res) {
  // Parse cookies manually (no cookie-parser dependency needed)
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(s => {
      const [k, ...v] = s.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );

  const refreshToken = cookies['fitfriend_rt'];

  if (!refreshToken) {
    return res.status(401).json({ error: 'no_refresh_token', message: 'Not logged in' });
  }

  const clientId     = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type:    'refresh_token',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      // Refresh token is invalid/revoked — clear cookie and ask user to log in again
      res.setHeader('Set-Cookie',
        'fitfriend_rt=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
      );
      return res.status(401).json({ error: tokens.error, message: 'Session expired, please log in again' });
    }

    const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;

    return res.status(200).json({
      access_token: tokens.access_token,
      expires_at:   expiresAt,
    });

  } catch (err) {
    console.error('[refresh] error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
