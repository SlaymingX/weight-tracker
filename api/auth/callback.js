// api/auth/callback.js
// Google redirects here after the user grants consent.
// We exchange the authorization code for access + refresh tokens,
// store the refresh token in an httpOnly cookie, and redirect home.

export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(302, `/?auth_error=${encodeURIComponent(error || 'no_code')}`);
  }

  const clientId     = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
  const redirectUri  = `${process.env.APP_URL}/api/auth/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('[callback] token exchange error:', tokens);
      return res.redirect(302, `/?auth_error=${encodeURIComponent(tokens.error)}`);
    }

    const { access_token, refresh_token, expires_in } = tokens;

    if (!refresh_token) {
      // This happens if the user already granted consent before and Google
      // didn't send a new refresh token. Redirect back with a note.
      // The frontend will use whatever access token we got.
      console.warn('[callback] no refresh_token returned — user may need to revoke and re-consent');
    }

    // Store refresh token in a secure, httpOnly cookie (never readable by JS)
    // Max-Age = 1 year (refresh tokens are long-lived)
    if (refresh_token) {
      res.setHeader('Set-Cookie', [
        `fitfriend_rt=${encodeURIComponent(refresh_token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 365}`,
      ]);
    }

    // Redirect home with the short-lived access token in the URL fragment
    // (fragment = #... is never sent to the server, stays client-side only)
    const expiresAt = Date.now() + (expires_in || 3600) * 1000;
    const fragment  = new URLSearchParams({
      access_token,
      expires_at: expiresAt,
    });

    res.redirect(302, `/#${fragment}`);

  } catch (err) {
    console.error('[callback] unexpected error:', err);
    res.redirect(302, '/?auth_error=server_error');
  }
}
