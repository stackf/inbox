import fetch from "node-fetch";

export const handler = async (event, context) => {
  const queryParams = new URLSearchParams(event.rawQuery || event.queryStringParameters);
  const code = queryParams.get("code");

  if (!code) {
    return {
      statusCode: 400,
      body: "Missing authorization code from Google",
    };
  }

  const tokenEndpoint = process.env.GMAIL_TOKEN_URI 
  const redirectUri = process.env.VITE_GMAIL_REDIRECT_URI 

  const params = new URLSearchParams();
  params.append("client_id", process.env.VITE_GMAIL_CLIENT_ID);
  params.append("client_secret", process.env.GMAIL_CLIENT_SECRET);
  params.append("code", code);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", redirectUri);

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Token exchange failed:", data);
      return {
        statusCode: 500,
        body: "Failed to exchange token with Google",
      };
    }

    const { access_token, refresh_token, expires_in, scope, token_type } = data;

    // 🔐 Store the refresh_token securely (e.g., encrypted DB, Netlify env vars, or external vault)
    console.log("✅ SUCCESS: Save this refresh token securely:", refresh_token);

    return {
      statusCode: 200,
      body: "Authorization successful. You can now close this window.",
    };
  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 500,
      body: "An error occurred during the OAuth process",
    };
  }
};
