// Handle-Inbox Cron Job
// Runs every 15 minutes to process unread emails
const OpenAIAssistant = require('./helpers/openai-assistant');

exports.handler = async function(event, context) {
  try {
    // Check if this is a scheduled event (from cron)
    if (event.httpMethod === 'GET' && !event.headers['x-netlify-trigger']) {
      return {
        statusCode: 401,
        body: 'Unauthorized'
      };
    }

    console.log('Starting Handle-Inbox cron job');

    // Get the OpenAI Assistant ID from environment variables
    const assistantId = process.env.HI_OPENAI_ASSISTANT_ID;
    
    if (!assistantId) {
      throw new Error('Missing required environment variable: HI_OPENAI_ASSISTANT_ID');
    }

    // Create an instance of the OpenAI Assistant helper with JSON response format
    const assistant = new OpenAIAssistant({
      assistantId: assistantId,
      responseFormat: 'json', // HI assistant uses JSON format
      context: context // Pass the context for tool calls
    });

    // Initialize a new thread (no key needed for HI as we create a new thread each time)
    await assistant.initializeThread();

    // Check if LIMIT_EMAIL_HANDLING environment variable exists and is a number
    const emailLimit = process.env.LIMIT_EMAIL_HANDLING;
    let message = 'Please process my inbox according to your instructions. Filter for emails without the "processed-by-hi" label.';
    
    if (emailLimit && !isNaN(Number(emailLimit))) {
      const limit = Number(emailLimit);
      message = `Please process only ${limit} email${limit > 1 ? 's' : ''} from my inbox according to your instructions. Filter for emails without the "processed-by-hi" label and limit to ${limit} email${limit > 1 ? 's' : ''} for this run.`;
    }
    
    // Add the instruction message to the thread
    await assistant.addMessage(message);

    // Run the assistant and handle all tool calls automatically
    const result = await assistant.run();
    
    console.log('Handle-Inbox cron job completed successfully');
    
    // Return result
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Handle-Inbox cron job completed successfully',
        threadId: assistant.threadId,
        result: result
      })
    };
  } catch (error) {
    console.error('Error in Handle-Inbox cron job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};