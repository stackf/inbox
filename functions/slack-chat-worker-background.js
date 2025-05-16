const getOpenAIMessagesFromSlackThread = require('./helpers/get-openai-messages-from-slack-thread');
exports.handler = async function(event, context) {
  console.log("Slack chat worker received");
  
  // Check if we have the environment variable
  if (!process.env.SLACK_BOT_TOKEN) {
    console.error("SLACK_BOT_TOKEN is missing!");
    return
  }

  // Parse the body as JSON
  const { slackEvent } = JSON.parse(event.body);


    // Log detailed event info
    console.log(`New message from Slack:`, slackEvent);
    console.log(`Event type: ${slackEvent.type}, subtype: ${slackEvent.subtype || 'none'}`);
    
    // Check for bot messages to avoid loops
    if (slackEvent.bot_id) {
      console.log("Ignoring bot message to prevent loops");
      return
    }

    if (slackEvent.type === 'message') {
      const text = slackEvent.text;
      const user = slackEvent.user;
      const channel = slackEvent.channel;
      const thread_ts = slackEvent.thread_ts || slackEvent.ts;
  
      // TODO: Handle this text (send to OpenAI, etc.)
      // 🧠 Get thread history and format for OpenAI
      const openaiMessages = await getOpenAIMessagesFromSlackThread(channel, thread_ts);
      console.log("Formatted OpenAI messages:", openaiMessages);
  
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
            thread_ts: thread_ts,  
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
    if (slackEvent.type === 'app_mention') {
      const text = slackEvent.text;
      const user = slackEvent.user;
      const channel = slackEvent.channel;
  
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
            thread_ts: slackEvent.ts,
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
  
};
  