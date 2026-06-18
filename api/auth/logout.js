// api/auth/logout.js
// Clears the httpOnly refresh token cookie and redirects home.

export default function handler(req, res) {
  res.setHeader('Set-Cookie',
    'fitfriend_rt=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
  );
  res.redirect(302, '/');
}
