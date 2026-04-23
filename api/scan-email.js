import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://roof-notes.vercel.app/api/auth/callback'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export default async function handler(req, res) {
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:RoofNotes is:unread',
      maxResults: 10,
    });

    const messages = response.data.messages || [];
    const processed = [];

    for (const msg of messages) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const payload = full.data.payload;
      let body = '';

      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      } else if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }

      if (body.trim()) {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: 'You are an AI assistant for a roofing project manager. Analyze phone call transcripts and extract structured information. Return ONLY a valid JSON object with these keys: callSummary, clientContact, propertyJobDetails, scopeOfWork, estimatingFinance, scheduling, salesPipeline, actionItems, internalNotes, personalConnection. Each key should be an array of bullet point strings. Only include keys that have actual information from the call. Return ONLY the JSON, no markdown, no explanation.',
            messages: [{ role: 'user', content: `Analyze this roofing call transcript:\n\n${body}` }],
          }),
        });

        const anthropicData = await anthropicResponse.json();
        const text = anthropicData.content?.map((b) => b.text || '').join('') || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const notes = JSON.parse(clean);

        await gmail.users.messages.modify({
          userId: 'me',
          id: msg.id,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });

        processed.push({ id: msg.id, notes });
      }
    }

    res.status(200).json({ processed: processed.length, results: processed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to scan email', details: err.message });
  }
}
