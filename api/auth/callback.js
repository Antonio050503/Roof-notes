export default async function handler(req, res) {
  const { code } = req.query;
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = 'https://roof-notes.vercel.app/api/auth/callback';

  if (!code) {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify',
      access_type: 'offline',
      prompt: 'consent',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
      <html>
        <body style="background:#0A0F1E;color:#00C9A7;font-family:monospace;padding:40px;">
          <h2>Your Refresh Token:</h2>
          <textarea style="width:100%;height:100px;background:#1A2740;color:#fff;padding:10px;font-size:16px;border:1px solid #00C9A7;">${tokens.refresh_token}</textarea>
          <p style="color:#fff;">Copy the text above and add it to Vercel as GOOGLE_REFRESH_TOKEN</p>
          <p style="color:#6B8CAE;">Full response: ${JSON.stringify(tokens)}</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
