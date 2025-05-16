// netlify/functions/checkInbox.js

import getGmailAccessToken from './helpers/gmail-get-access-token.js';
import fetch from 'node-fetch';

export const handler = async function(event, context) {
  try {
    const accessToken = await getGmailAccessToken();
    console.log(`Access token: ${accessToken}`);

    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!gmailResponse.ok) {
      const text = await gmailResponse.text();
      throw new Error(`Failed to fetch Gmail messages: ${gmailResponse.status} - ${text}`);
    }

    const gmailData = await gmailResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify(gmailData),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: `Error: ${err.message}`,
    };
  }
};
