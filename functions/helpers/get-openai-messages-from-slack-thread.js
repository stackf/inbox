const fetch = require('node-fetch');

async function getOpenAIMessagesFromSlackThread(channel, thread_ts) {
    const response = await fetch('https://slack.com/api/conversations.replies', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: channel,
        ts: thread_ts
      })
    });
  
    const data = await response.json();
    if (!data.ok) {
      console.error("Failed to fetch thread history:", data.error);
      return [];
    }
  
    const messages = data.messages;
  
    return messages.map(msg => {
      // Assume your bot's user ID is in env for role detection
      const isBot = msg.bot_id || msg.user === process.env.SLACK_BOT_USER_ID;
      return {
        role: isBot ? 'assistant' : 'user',
        content: msg.text
      };
    });
  }

  module.exports = getOpenAIMessagesFromSlackThread;
