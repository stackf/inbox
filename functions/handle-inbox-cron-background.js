// Handle-Inbox Cron Job
// Runs every 15 minutes to process unread emails
const OpenAIAssistant = require('./helpers/openai-assistant');
const getGmailAccessToken = require('./helpers/gmail-get-access-token');
// const { schedule } = require("@netlify/functions");


// Function to archive emails with archive-in-3-days label that are older than 3 days
async function archiveOldEmailsWithLabel() {
  try {
    const accessToken = await getGmailAccessToken();
    const days = 3; // Fixed at 3 days
    
    // Calculate the timestamp for 3 days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const timestamp = Math.floor(daysAgo.getTime() / 1000);
    
    console.log(`Looking for emails with archive-in-3-days label older than ${days} days (before ${new Date(timestamp * 1000).toISOString()})`);
    
    // Build the query using the label name
    const labelName = 'archive-in-3-days' 
    const labelId = process.env.GMAIL_LABEL_ID_ARCHIVE_IN_3_DAYS;
    if (!labelId) {
      console.error('Missing GMAIL_LABEL_ID_ARCHIVE_IN_3_DAYS environment variable');
      return {
        archivedCount: 0,
        totalFound: 0,
        error: 'Missing GMAIL_LABEL_ID_ARCHIVE_IN_3_DAYS environment variable'
      };
    }
    
    // Get emails with archive-in-3-days label that are older than 3 days
    const queryParams = new URLSearchParams();
    queryParams.append('q', `label:${labelName} before:${timestamp}`);
    
    const listResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`Failed to fetch Gmail messages: ${listResponse.status} - ${errorText}`);
    }
    
    const listData = await listResponse.json();
    const messages = listData.messages || [];
    
    console.log(`Found ${messages.length} emails to archive`);
    
    if (messages.length === 0) {
      return {
        archivedCount: 0,
        totalFound: 0
      };
    }
    
    // Archive each message by removing the INBOX label
    const results = await Promise.all(
      messages.map(async (msg) => {
        try {
          // Remove INBOX label to archive
          const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              removeLabelIds: ['INBOX', labelId]
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to archive message ${msg.id}: ${response.status} - ${errorText}`);
            return {
              messageId: msg.id,
              success: false
            };
          }
          
          return {
            messageId: msg.id,
            success: true
          };
        } catch (error) {
          console.error(`Error archiving message ${msg.id}:`, error);
          return {
            messageId: msg.id,
            success: false,
            error: error.message
          };
        }
      })
    );
    
    return {
      archivedCount: results.filter(r => r.success).length,
      totalFound: messages.length,
      results
    };
  } catch (error) {
    console.error('Error in archiveOldEmailsWithLabel:', error);
    return {
      archivedCount: 0,
      totalFound: 0,
      error: error.message
    };
  }
}

const handler = async function(event, context) {
  try {
    // Check if this is a scheduled event (from cron)
    if (event.httpMethod === 'GET' && !event.headers['x-netlify-trigger']) {
      return {
        statusCode: 401,
        body: 'Unauthorized'
      };
    }

    console.log('Starting Handle-Inbox cron job');

    // First, archive old emails with the archive-in-3-days label
    console.log('Running archive old emails process...');
    const archiveResult = await archiveOldEmailsWithLabel();
    console.log(`Archived ${archiveResult.archivedCount} emails out of ${archiveResult.totalFound} found with archive-in-3-days label`);

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
        archiveResult: {
          archivedCount: archiveResult.archivedCount,
          totalFound: archiveResult.totalFound
        },
        assistantResult: result
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

exports.handler = handler
// Schedule the handler to run every 15 minutes
// exports.handler = schedule('*/15 * * * *', handler);
