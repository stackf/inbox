exports.handler = async function(event, context) {
  console.log("Slack Event received");
  
  // Check if we have the environment variable
  if (!process.env.SLACK_BOT_TOKEN) {
    console.error("SLACK_BOT_TOKEN is missing!");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }
  
  const slackTimestamp = event.headers['x-slack-request-timestamp'];

  // Protect against replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
  if (parseInt(slackTimestamp) < fiveMinutesAgo) {
    return {
      statusCode: 400,
      body: 'Ignore this request (too old)'
    };
  }

  // Parse the body as JSON
  const body = JSON.parse(event.body);
  
  
  // Slack URL verification (first time setup)
  if (body.type === 'url_verification') {
    return {
      statusCode: 200,
      body: JSON.stringify({ challenge: body.challenge }), 
    }
  }

  // Handle event callbacks here
  if (body.type === 'event_callback') {
    const slackEvent = body.event;
    console.log('base_url', process.env.BASE_URL);
    await fetch(`${process.env.BASE_URL}/.netlify/functions/slack-chat-worker-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({slackEvent})
    });

  }

  

  return {
    statusCode: 200,
    body: 'OK',
  }
};
  