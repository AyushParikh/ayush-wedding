const { google } = require('googleapis');

function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { firstName, lastName, responses, counts } = req.body || {};

  if (!firstName || !lastName || !responses || typeof responses !== 'object') {
    return res.status(400).json({ error: 'firstName, lastName, and responses are required' });
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetId = process.env.RESPONSE_SHEET_ID;
    const sheetName = process.env.RESPONSE_SHEET_NAME || 'Responses';
    const timestamp = new Date().toISOString();

    const rows = Object.entries(responses).map(([event, response]) => [
      timestamp,
      firstName.trim(),
      lastName.trim(),
      event,
      response,
      (counts && counts[event]) ? Number(counts[event]) : '',
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: sheetName,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('submit error:', err);
    return res.status(500).json({ error: 'Failed to save RSVP' });
  }
};
