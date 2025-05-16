import fetch from 'node-fetch';

async function getGmailAccessToken() {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const clientId = process.env.VITE_GMAIL_CLIENT_ID;
  const clientSecret = process.env.VITE_GMAIL_CLIENT_SECRET;
  console.log('getGmailAccessToken called with refresh token', !!refreshToken);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
    console.log('Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export default getGmailAccessToken;
