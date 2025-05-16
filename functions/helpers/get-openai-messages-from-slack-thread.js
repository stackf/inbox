const fetch = require('node-fetch');

async function getOpenAIMessagesFromSlackThread(channel, thread_ts) {
    // Build the URL with query parameters
    const url = new URL('https://slack.com/api/conversations.replies');
    url.searchParams.append('channel', channel);
    url.searchParams.append('ts', thread_ts);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
      }
    });

    // Debug response status
    console.log('Slack API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error("HTTP error fetching thread:", response.status, response.statusText);
      return [];
    }
  
    const data = await response.json();
    
    // Debug full response data to see what we're getting
    console.log('Slack API response data:', JSON.stringify(data).substring(0, 500) + '...');
    
    if (!data.ok) {
      console.error("Slack API error:", data.error, "Details:", data);
      return [];
    }
  
    const messages = data.messages || [];
    
    if (!messages.length) {
      console.log("No messages found in thread");
      return [];
    }
    
    console.log(`Found ${messages.length} messages in thread`);
    
    return messages.map(msg => {
      // Assume your bot's user ID is in env for role detection
      const isBot = msg.bot_id || msg.user === process.env.SLACK_BOT_USER_ID;
      
      // Ensure we have text content
      const content = msg.text || '';
      
      return {
        role: isBot ? 'assistant' : 'user',
        content: content
      };
    });
  }

  module.exports = getOpenAIMessagesFromSlackThread;
