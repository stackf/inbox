exports.handler = async function(event, context) {
  
  const slackTimestamp = req.headers['x-slack-request-timestamp'];

  // Protect against replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
  if (parseInt(slackTimestamp) < fiveMinutesAgo) {
    return res.status(400).send('Ignore this request (too old)');
  }

  // Parse the rawBody as JSON
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
    const event = body.event;

    // Example: just log the message
    console.log(`New message from Slack:`, event);

    return {
      statusCode: 200,
      body: 'Event received',
    }
  }
  return {
    statusCode: 200,
    body: 'OK',
  }
};
  