// Handle-Inbox Cron Job
// Runs every 15 minutes to process unread emails

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

    console.log('Starting Handle-Inbox cron job');

    // Get the OpenAI Assistant ID from environment variables
    const assistantId = process.env.HI_OPENAI_ASSISTANT_ID;
    
    if (!assistantId) {
      throw new Error('Missing required environment variable: HI_OPENAI_ASSISTANT_ID');
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
      content: 'Please process my inbox according to your instructions. Filter for emails without the "processed by HI" label.'
    });

    console.log('Added message to thread');

    // 3. Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      tools: [
        { type: "function", function: { name: "gmail_inbox_retrieval" } },
        { type: "function", function: { name: "gmail_label_email" } },
        { type: "function", function: { name: "gmail_archive_email" } },
        { type: "function", function: { name: "gmail_forward_email" } },
        { type: "function", function: { name: "gmail_create_draft" } },
        { type: "function", function: { name: "gmail_get_message" } },
        { type: "function", function: { name: "gmail_get_attachment" } },
        { type: "function", function: { name: "gmail_search_unsubscribe_link" } },
        { type: "function", function: { name: "slack_send_message" } },
        { type: "function", function: { name: "trello_create_card" } },
        { type: "function", function: { name: "archive_old_emails" } }
      ]
    });

    console.log(`Started run with ID: ${run.id}`);

    // 4. Return success
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Handle-Inbox cron job started successfully',
        threadId: threadId,
        runId: run.id
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