// Daily-Report Cron Job
// Runs daily at 19:00 (Amsterdam time) to summarize emails labeled with "to-summarize"

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

    console.log('Starting Daily-Report cron job');

    // Get the OpenAI Assistant ID from environment variables
    const assistantId = process.env.DARE_OPENAI_ASSISTANT_ID;
    const slackChannel = process.env.SLACK_REPORT_CHANNEL_ID;

    if (!assistantId || !slackChannel) {
      throw new Error('Missing required environment variables: DARE_OPENAI_ASSISTANT_ID or SLACK_REPORT_CHANNEL_ID');
    }

    // Create an instance of the OpenAI Assistant helper with JSON response format
    const assistant = new OpenAIAssistant({
      assistantId: assistantId,
      responseFormat: 'json', // DARE assistant uses JSON format
      context: context // Pass the context for tool calls
    });

    // Initialize a new thread
    await assistant.initializeThread();

    // Add the instruction message to the thread
    await assistant.addMessage(
      `Please create a daily summary report for emails labeled "to-summarize" from the last 24 hours. Post the summary to the Slack channel ${slackChannel}.`
    );

    // Run the assistant and handle all tool calls automatically
    const result = await assistant.run();
    
    console.log('Daily-Report cron job completed successfully');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily-Report cron job completed successfully',
        threadId: assistant.threadId,
        result: result
      })
    };
  } catch (error) {
    console.error('Error in Daily-Report cron job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};