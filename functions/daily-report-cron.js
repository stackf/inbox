// Daily-Report Cron Job
// Runs daily at 19:00 (Amsterdam time) to summarize emails labeled with "to-summarize"

const OpenAI = require("openai");

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

    // Initialize OpenAI SDK
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 1. Create a new thread
    const thread = await openai.beta.threads.create();
    const threadId = thread.id;
    console.log(`Created thread with ID: ${threadId}`);

    // 2. Add a message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: `Please create a daily summary report for emails labeled "to-summarize" from the last 24 hours. Post the summary to the Slack channel ${slackChannel}.`
    });

    console.log('Added message to thread');

    // 3. Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      tools: [
        { type: "function", function: { name: "gmail_inbox_retrieval" } },
        { type: "function", function: { name: "gmail_get_message" } },
        { type: "function", function: { name: "gmail_search_unsubscribe_link" } },
        { type: "function", function: { name: "slack_send_message" } }
      ]
    });

    console.log(`Started run with ID: ${run.id}`);

    // 4. Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily-Report cron job started successfully',
        threadId: threadId,
        runId: run.id
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