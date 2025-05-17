const getOpenAIMessagesFromSlackThread = require('./helpers/get-openai-messages-from-slack-thread');
const OpenAIAssistant = require('./helpers/openai-assistant');
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  console.log("Slack chat worker received");
  
  // Check if we have the required environment variables
  if (!process.env.SLACK_BOT_TOKEN || !process.env.CHAT_OPENAI_ASSISTANT_ID) {
    console.error("Missing required environment variables!");
    return;
  }

  // Parse the body as JSON
  const { slackEvent } = JSON.parse(event.body);

  // Check for bot messages to avoid loops
  if (slackEvent.bot_id) {
    console.log("Ignoring bot message to prevent loops");
    return;
  }

  // Handle different types of Slack events
  if (slackEvent.type === 'message' || slackEvent.type === 'app_mention') {
    const text = slackEvent.text;
    const user = slackEvent.user;
    const channel = slackEvent.channel;
    const thread_ts = slackEvent.thread_ts || slackEvent.ts;
    
    console.log(`Received message: ${text} from user ${user} in channel ${channel}, thread ${thread_ts}`);
    
    // Send an acknowledgment that we're processing the message
    try {
      await sendSlackMessage(channel, "Thinking...", thread_ts);
    } catch (error) {
      console.error('Error sending acknowledgment:', error);
    }

    // Create a thread key based on Slack channel and thread timestamp
    const threadKey = `slack-${channel}-${thread_ts}`;
    
    // Create an instance of the OpenAI Assistant helper with text response format
    const assistant = new OpenAIAssistant({
      assistantId: process.env.CHAT_OPENAI_ASSISTANT_ID,
      responseFormat: 'text', // CHAT assistant uses text format
      context: context // Pass the context for tool calls
    });

    // Initialize thread - this will either create a new thread or retrieve an existing one
    await assistant.initializeThread(threadKey);
    
    // Get the conversation history from Slack
    try {
      // If we're continuing a thread, get the history to provide context
      if (slackEvent.thread_ts) {
        // Get conversation history
        const openaiMessages = await getOpenAIMessagesFromSlackThread(channel, thread_ts);
        
        // Only add previous messages if this is a new thread for the assistant
        // (If we've already loaded this thread, the messages are already there)
        const previousMessagesInThread = openaiMessages.length - 1; // Minus the current message
        
        if (previousMessagesInThread > 0) {
          console.log(`Adding ${previousMessagesInThread} previous messages for context`);
          
          // Add each message to the thread (except the last one which is the current message)
          for (let i = 0; i < previousMessagesInThread; i++) {
            const msg = openaiMessages[i];
            await assistant.addMessage(msg.content, msg.role);
          }
        }
      }
      
      // Add the current message from the user
      await assistant.addMessage(text);
      
      // Run the assistant
      const result = await assistant.run();
      
      if (result.status === 'completed') {
        // Send the assistant's response back to Slack
        await sendSlackMessage(channel, result.content, thread_ts);
        console.log('Assistant response sent to Slack');
      } else {
        // Handle error
        console.error('Assistant run failed:', result);
        await sendSlackMessage(
          channel, 
          `I encountered a problem while processing your request: ${result.error || 'Unknown error'}`, 
          thread_ts
        );
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Send error message to Slack
      try {
        await sendSlackMessage(
          channel,
          "Sorry, I encountered an error while processing your message.",
          thread_ts
        );
      } catch (slackError) {
        console.error('Error sending error message to Slack:', slackError);
      }
    }
  }
};

/**
 * Helper function to send a message to Slack
 */
async function sendSlackMessage(channel, text, thread_ts = null) {
  const requestBody = {
    channel,
    text,
  };
  
  // Add thread_ts if replying to a thread
  if (thread_ts) {
    requestBody.thread_ts = thread_ts;
  }
  
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send Slack message: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error}`);
  }
  
  return data;
}
  