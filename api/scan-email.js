import { google } from 'googleapis';

function formatNotes(notes, subject) {
  const CATEGORIES = [
    { key: 'callSummary', label: 'CALL SUMMARY' },
    { key: 'clientContact', label: 'CLIENT & CONTACT INFO' },
    { key: 'propertyJobDetails', label: 'PROPERTY & JOB DETAILS' },
    { key: 'scopeOfWork', label: 'SCOPE OF WORK' },
    { key: 'estimatingFinance', label: 'ESTIMATING & FINANCE' },
    { key: 'scheduling', label: 'SCHEDULING' },
    { key: 'salesPipeline', label: 'SALES & PIPELINE' },
    { key: 'actionItems', label: 'ACTION ITEMS' },
    { key: 'internalNotes', label: 'INTERNAL NOTES' },
    { key: 'personalConnection', label: 'PERSONAL / CONNECTION COMMENTS' },
  ];

  let out = 'ROOFNOTES CALL SUMMARY\n';
  out += '='.repeat(50) + '\n';
  out += 'Call: ' + subject + '\n';
  out += 'Processed: ' + new Date().toLocaleString() + '\n';
  out += '='.repeat(50) + '\n\n';

  CATEGORIES.forEach(function(cat) {
    const items = notes[cat.key];
    if (items && items.length > 0) {
      out += cat.label + '\n';
      out += '-'.repeat(cat.label.length) + '\n';
      items.forEach(function(item) { out += '- ' + item + '\n'; });
      out += '\n';
    }
  });

  return out;
}

const PROCESSED_LABEL_ID = 'Label_1236778203372123741';

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
      q: 'subject:RoofNotes -label:RoofNotes-Processed',
      maxResults: 10,
    });

    const messages = listResponse.data.messages;

    if (!messages || messages.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No new RoofNotes emails found' });
    }

    const processed = [];

    for (const msg of messages) {
      // Apply label IMMEDIATELY to prevent duplicate processing
      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id,
        requestBody: { addLabelIds: [PROCESSED_LABEL_ID] },
      });

      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      });

      const payload = full.data.payload;
      const headers = payload.headers || [];
      const subject = headers.find(function(h) { return h.name === 'Subject'; })?.value || '';

      let body = '';

      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body && part.body.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      } else if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }

      if (!body.trim()) continue;

      const anthropicRespo
