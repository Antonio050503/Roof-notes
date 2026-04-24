import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://roof-notes.vercel.app/api/auth/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults: 10,
    });

    return res.status(200).json({ 
      debug: true,
      totalMessages: listResponse.data.resultSizeEstimate,
      messages: listResponse.data.messages || [],
      rawResponse: listResponse.data
    });

  } catch (err) {
    return res.status(500).json({ 
      error: err.message,
      stack: err.stack
    });
  }
}
