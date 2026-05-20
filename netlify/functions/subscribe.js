// netlify/functions/subscribe.js
// Adds a subscriber to the correct רב מסר list based on persona + age group
//
// Required Netlify environment variables:
//   RAVMESSER_CLIENT_ID      = 210
//   RAVMESSER_ACCOUNT_ID     = 1002442
//   RAVMESSER_CLIENT_SECRET  = 68AHjdq80R3ndbzzotufSAFcBvsTYEKmmOU3f22v
//   RAVMESSER_CLIENT_TOKEN   = fe24d009d5926513c0b53111251d0798b4aea49d9abf5574851245e782ec7174

const API_BASE = 'https://api.responder.co.il/v2.0';

// List ID map — persona × age group
const LIST_IDS = {
  navigating_captain: {
    toddlers: 101666,
    school:   101667,
    teens:    101668,
  },
  rigid_officer: {
    toddlers: 101669,
    school:   101670,
    teens:    101671,
  },
  buddy_sailor: {
    toddlers: 101672,
    school:   101673,
    teens:    101674,
  },
  lost_sailor: {
    toddlers: 101675,
    school:   101676,
    teens:    101677,
  },
};

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name, email, persona, ageGroup, warmth, structure } = body;

  // Validate
  if (!name || !email || !persona || !ageGroup) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  // Look up list ID
  const listId = LIST_IDS[persona]?.[ageGroup];
  if (!listId) {
    console.error(`Unknown persona/ageGroup: ${persona}/${ageGroup}`);
    return { statusCode: 400, body: `Unknown persona/ageGroup: ${persona}/${ageGroup}` };
  }

  // Build auth header using client_token
  const clientToken = process.env.RAVMESSER_CLIENT_TOKEN;
  const clientSecret = process.env.RAVMESSER_CLIENT_SECRET;

  if (!clientToken || !clientSecret) {
    console.error('Missing רב מסר credentials in environment variables');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  // רב מסר V2 auth: Authorization header with client_token
  const authHeader = `Bearer ${clientToken}`;

  try {
    const response = await fetch(
      `${API_BASE}/lists/${listId}/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': authHeader,
          'X-Client-Secret': clientSecret,
        },
        body: JSON.stringify({
          subscribers: [
            {
              NAME:   name,
              EMAIL:  email,
              NOTIFY: 2,
              // Custom fields for segmentation — set these up in רב מסר if needed
              // FIELDS: { persona, ageGroup, warmth, structure }
            }
          ]
        }),
      }
    );

    const result = await response.json();
    console.log('רב מסר response:', JSON.stringify(result));

    // Log useful info
    if (result.ERRORS?.length) {
      console.error('רב מסר errors:', result.ERRORS);
    }
    if (result.EMAILS_EXISTING?.includes(email)) {
      console.log(`Email already exists in list ${listId}: ${email}`);
    }

    // Always return 200 — user gets results regardless of API outcome
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok:       true,
        created:  result.SUBSCRIBERS_CREATED?.length > 0,
        existing: result.EMAILS_EXISTING?.includes(email) || false,
      }),
    };

  } catch (err) {
    console.error('Subscribe function error:', err);
    // Still return 200 — user gets results regardless
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
