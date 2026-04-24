import { google } from 'googleapis';

export default async function handler(req, res) {
  const log = [];
  
  try {
    log.push('Step 1: Setting up OAuth');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://roof-notes.vercel.app/api/auth/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    log.push('Step 2: Connecting to Gmail');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    log.push('Step 3: Searching for emails');
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:inbox',
      maxResults: 10,
    });

    const messages = listResponse.data.messages;
    log.push(`Step 4: Found ${messages ? messages.length : 0} messages`);

    if (!messages || messages.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No emails found', log });
    }

    const processed = [];

    for (const msg of messages) {
      log.push(`Step 5: Getting email ${msg.id}`);
      
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const payload = full.data.payload;
      const headers = payload.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
      
      log.push(`Step 6: Email subject: ${subject}`);

      if (!subject.includes('RoofNotes')) {
        log.push(`Step 7: Skipping - not a RoofNotes email`);
        continue;
      }

      log.push(`Step 8: Processing RoofNotes email`);
      
      let body = '';

      if (payload.parts) {
        log.push(`Step 9a: Email has ${payload.parts.length} parts`);
        for (const part of payload.parts) {
          log.push(`Step 9b: Part mimeType: ${part.mimeType}, hasData: ${!!(part.body && part.body.data)}`);
          if (part.mimeType === 'text/plain' && part.body && part.body.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
            log.push(`Step 9c: Extracted ${body.length} chars from part`);
          }
        }
      } else if (payload.body && payload.body.data) {
        log.push(`Step 9d: Email has direct body`);
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        log.push(`Step 9e: Extracted ${body.length} chars from body`);
      } else {
        log.push(`Step 9f: No body found - payload keys: ${Object.keys(payload).join(', ')}`);
      }

      if (!body.trim()) {
        log.push(`Step 10: Body is empty - skipping`);
        continue;
      }

      log.push(`Step 11: Sending ${body.length} chars to Claude`);

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

      log.push(`Step 12: Claude responded with status ${anthropicResponse.status}`);

      const anthropicData = await anthropicResponse.json();

      if (!anthropicData.content || anthropicData.content.length === 0) {
        log.push(`Step 13: Claude returned empty response`);
        continue;
      }

      const text = anthropicData.content.map((b) => b.text || '').join('');
      const clean = text.replace(/```json|```/g, '').trim();

      log.push(`Step 14: Parsing Claude response`);

      let notes;
      try {
        notes = JSON.parse(clean);
        log.push(`Step 15: Successfully parsed notes`);
      } catch (parseErr) {
        log.push(`Step 15: Failed to parse notes: ${parseErr.message}`);
        continue;
      }

      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });

      log.push(`Step 16: Marked email as read`);
      processed.push({ id: msg.id, subject, notes });
    }

    res.status(200).json({ processed: processed.length, results: processed, log });

  } catch (err) {
    res.status(500).json({ error: err.message, log });
  }
}
