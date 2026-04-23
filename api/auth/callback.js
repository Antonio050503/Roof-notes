import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://roof-notes.vercel.app/api/auth/callback'
);

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly',
              'https://www.googleapis.com/auth/gmail.modify'],
      prompt: 'consent',
    });
    return res.redirect(authUrl);
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.status(200).json({ 
      refresh_token: tokens.refresh_token,
      message: 'Copy this refresh token and add it to Vercel environment variables as GOOGLE_REFRESH_TOKEN'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
