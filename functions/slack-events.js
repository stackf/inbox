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
  
  // Debug headers
  console.log("Headers:", JSON.stringify(event.headers));
  
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
  
  // Log the body type for debugging
  console.log("Event type:", body.type);
  console.log("Event body:", JSON.stringify(body).substring(0, 500) + "...");

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

    // Log detailed event info
    console.log(`New message from Slack:`, event);
    console.log(`Event type: ${event.type}, subtype: ${event.subtype || 'none'}`);
    
    // Check for bot messages to avoid loops
    if (event.bot_id) {
      console.log("Ignoring bot message to prevent loops");
      return {
        statusCode: 200,
        body: 'Bot message ignored'
      };
    }

    if (event.type === 'message') {
      const text = event.text;
      const user = event.user;
      const channel = event.channel;
      // const thread_ts = event.thread_ts || event.ts;
  
      // TODO: Handle this text (send to OpenAI, etc.)
  
      console.log(`Received message: ${text} from user ${user}`);
  
      // Optionally reply back
      try {
        const sendMessageResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: channel,
            // thread_ts: thread_ts,  
            text: "Got your message! Thinking..."
          })
        });
        
        if(!sendMessageResponse?.ok) {
          console.error('Error sending message:', sendMessageResponse.status, sendMessageResponse.statusText);
        } else {
          const responseData = await sendMessageResponse.json();
          console.log('Message sent response:', responseData);
          
          if (!responseData.ok) {
            console.error('Slack API error:', responseData.error);
          }
        }
      } catch (error) {
        console.error('Exception sending message:', error);
      }
    }
  
    // App mention
    if (event.type === 'app_mention') {
      const text = event.text;
      const user = event.user;
      const channel = event.channel;
  
      console.log(`User ${user} mentioned the bot: ${text}`);
  
      // Reply in thread
      try {
        const mentionResponse = await fetch('https://slack.com/api/chat.postMessage', {
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
        
        if(!mentionResponse?.ok) {
          console.error('Error sending mention response:', mentionResponse.status, mentionResponse.statusText);
        } else {
          const responseData = await mentionResponse.json();
          console.log('Mention response:', responseData);
          
          if (!responseData.ok) {
            console.error('Slack API error on mention:', responseData.error);
          }
        }
      } catch (error) {
        console.error('Exception sending mention response:', error);
      }
    }

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
  