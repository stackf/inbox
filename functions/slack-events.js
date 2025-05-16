exports.handler = async function(event, context) {
  
  const slackTimestamp = event.headers['x-slack-request-timestamp'];

  // Protect against replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - (60 * 5);
  if (parseInt(slackTimestamp) < fiveMinutesAgo) {
    return {
      statusCode: 400,
      body: 'Ignore this request (too old)'
    };
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

  if (event.type === 'message') {
    const text = event.text;
    const user = event.user;
    const channel = event.channel;
    const thread_ts = event.thread_ts || event.ts;

    // TODO: Handle this text (send to OpenAI, etc.)

    console.log(`Received message: ${text} from user ${user}`);

    // Optionally reply back
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channel,
        thread_ts: thread_ts,
        text: "Got your message! Thinking..."
      })
    });
  }

  // App mention
  if (event.type === 'app_mention') {
    const text = event.text;
    const user = event.user;
    const channel = event.channel;

    console.log(`User ${user} mentioned the bot: ${text}`);

    // Reply in thread
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channel,
        thread_ts: event.ts,
        text: "Hi there! Let me look into that..."
      })
    });
  }
  
  return {
    statusCode: 200,
    body: 'OK',
  }
};
  