const { google } = require('googleapis');

function getAuth() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets.readonly']
  );
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'code query param is required' });
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const sheetId = process.env.GUEST_SHEET_ID;
    const sheetName = process.env.GUEST_SHEET_NAME || 'Guests';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: sheetName,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) {
      return res.status(200).json({ found: false });
    }

    const headers = rows[0];
    const skipCols = new Set(['limit', 'code']);

    const codeColIndex = headers.findIndex(h => h.trim().toLowerCase() === 'code');
    const limitColIndex = headers.findIndex(h => h.trim().toLowerCase() === 'limit');

    const codeLower = code.trim().toLowerCase();
    console.log('looking for code:', codeLower, 'codeColIndex:', codeColIndex);
    const guestRow = rows.slice(1).find(row => {
      const stored = (row[codeColIndex] || '').trim().toLowerCase();
      console.log('stored code:', stored);
      return stored === codeLower;
    });

    if (!guestRow) {
      return res.status(200).json({ found: false });
    }

    const truthy = new Set(['yes', 'y', '1', 'true']);

    const events = headers.slice(2)
      .map((header, i) => ({ header, val: (guestRow[i + 2] || '').trim().toLowerCase() }))
      .filter(({ header, val }) => !skipCols.has(header.trim().toLowerCase()) && truthy.has(val))
      .map(({ header }) => header.trim());

    const limit = limitColIndex >= 0
      ? parseInt(guestRow[limitColIndex] || '0', 10) || null
      : null;

    return res.status(200).json({
      found: true,
      firstName: guestRow[0].trim(),
      lastName: guestRow[1].trim(),
      events,
      limit,
    });
  } catch (err) {
    console.error('lookup error:', err);
    return res.status(500).json({ error: 'Failed to look up guest' });
  }
};
