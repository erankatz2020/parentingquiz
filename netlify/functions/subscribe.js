const API_BASE = 'https://api.responder.co.il/v2.0';

const LIST_IDS = {
  navigating_captain: { toddlers: 101666, school: 101667, teens: 101668 },
  rigid_officer:      { toddlers: 101669, school: 101670, teens: 101671 },
  buddy_sailor:       { toddlers: 101672, school: 101673, teens: 101674 },
  lost_sailor:        { toddlers: 101675, school: 101676, teens: 101677 },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: 'Invalid JSON' };
  }

  const { name, email, persona, ageGroup } = body;

  if (!name || !email || !persona || !ageGroup) {
    return { statusCode: 400, headers: CORS, body: 'Missing required fields' };
  }

  const listId = LIST_IDS[persona]?.[ageGroup];
  if (!listId) {
    return { statusCode: 400, headers: CORS, body: `Unknown persona/ageGroup: ${persona}/${ageGroup}` };
  }

  const clientToken  = process.env.RAVMESSER_CLIENT_TOKEN;
  const clientSecret = process.env.RAVMESSER_CLIENT_SECRET;

  try {
    const response = await fetch(
      `${API_BASE}/lists/${listId}/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${process.env.RAVMESSER_CLIENT_ID}:${clientToken}`).toString('base64')}`,
        },
        body: JSON.stringify({
          subscribers: [{ NAME: name, EMAIL: email, NOTIFY: 2 }]
        }),
      }
    );

    const result = await response.json();
    console.log('רב מסר status:', response.status);
    console.log('רב מסר response:', JSON.stringify(result));
    console.log('listId:', listId);
    console.log('clientToken present:', !!clientToken);
    console.log('clientSecret present:', !!clientSecret);

    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, ravmesser: result, listId, tokenPresent: !!clientToken, secretPresent: !!clientSecret }),
    };

  } catch (err) {
    console.error('Subscribe error:', err);
    return {
      statusCode: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
