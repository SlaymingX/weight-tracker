// api/auth/login.js
// Redirects the user to Google's OAuth consent screen.
// After consent, Google redirects back to /api/auth/callback.

export default function handler(req, res) {
  const clientId    = process.env.GDRIVE_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/drive.appdata',
    access_type:   'offline',   // request a refresh token
    prompt:        'consent',   // always show consent to guarantee refresh token
  });

  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
