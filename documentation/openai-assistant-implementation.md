# OpenAI Assistant Implementation

This document outlines the implementation architecture for the three OpenAI Assistants used in the email management system: HI (Handle-Inbox), DARE (Daily-Report), and CHAT.

## Overview

We've created a modular architecture with:

1. A shared core OpenAI Assistant class
2. Three workflow-specific implementations
3. Tool-specific implementations for each assistant

This approach allows for:
- Code reuse
- Consistent error handling
- Different response formats (JSON vs. natural text)
- Persistence of conversation history

## Configuration Settings

| Assistant | Model       | Response Format | Temperature | Top P | Tools                           |
|-----------|-------------|----------------|-------------|-------|--------------------------------|
| HI        | gpt-4o-mini | JSON           | 0.2         | 0.9   | None or File Search             |
| DARE      | gpt-4o      | JSON           | 0.5         | 1.0   | Code Interpreter (optional)     |
| CHAT      | gpt-4o      | Natural text   | 0.6         | 1.0   | File Search + Code Interpreter  |

## Core OpenAI Assistant Module

Located at `/functions/helpers/openai-assistant.js`, this class handles:

- Thread creation and management
- Message formatting and submission
- Tool call handling
- Response processing
- Error handling

```javascript
// Example usage
const assistant = new OpenAIAssistant({
  assistantId: process.env.ASSISTANT_ID,
  threadId: existingThreadId // optional
});

// Register tools
assistant.registerTool('toolName', toolHandler);

// Add messages
await assistant.addMessage('User message');

// Run the assistant
const result = await assistant.run(context);

// Process the response
if (result.status === 'completed') {
  const response = result.content;
  // Use result.jsonContent for JSON responses
}
```

## Workflow-Specific Implementations

### 1. HI Assistant (`/functions/hi-assistant.js`)

The Handle-Inbox Assistant processes unread emails and categorizes them based on importance. It uses JSON response format for structured decision-making.

Features:
- Runs every 15 minutes
- Processes one email at a time
- Labels emails after processing
- Creates draft responses for important emails
- Notifies the boss via Slack for urgent items

Tools:
- Email operations (archive, label, forward, draft)
- Slack notifications
- Trello card creation

### 2. DARE Assistant (`/functions/dare-assistant.js`)

The Daily-Report Assistant creates a summary of emails labeled for summarization in the past 24 hours. It uses JSON response format for structured data.

Features:
- Runs daily at 19:00 Amsterdam time
- Processes emails labeled as "to-summarize"
- Creates HackerNews-style digests
- Posts summary to Slack

Tools:
- Email retrieval and content extraction
- Unsubscribe link extraction
- Slack posting
- Trello card creation

### 3. CHAT Assistant (`/functions/chat-assistant.js`)

The Chat Assistant handles interactive conversations with the boss through Slack. It uses natural text format for a conversational experience.

Features:
- Responds to Slack messages
- Maintains conversation context across sessions
- Can update system prompts of other assistants
- Provides access to all email management tools

Tools:
- All email operations
- Slack messaging
- Trello card creation
- System prompt updating

## Thread Persistence

The CHAT Assistant implementation includes a `ThreadStorage` class to maintain conversation context across function invocations:

```javascript
class ThreadStorage {
  async getThreadId(channel, thread_ts) {
    // Retrieve thread ID from database
  }
  
  async storeThreadId(channel, thread_ts, threadId) {
    // Store thread ID in database
  }
}
```

In a production implementation, this would connect to a database (e.g., DynamoDB, MongoDB) to store the mapping between Slack threads and OpenAI Assistant threads.

## Tool Implementation

Each assistant registers tools that it can use. Tool handlers follow a consistent pattern:

```javascript
async function toolHandler(args, context) {
  // Process the arguments
  const { param1, param2 } = args;
  
  // Perform the operation
  // ...
  
  // Return a result
  return {
    success: true,
    // Additional data...
  };
}
```

## Response Processing

The core module handles both JSON and text responses:

- For HI and DARE (JSON format):
  ```javascript
  if (result.jsonContent) {
    // Use the parsed JSON directly
    processResponse(result.jsonContent);
  } else {
    // Attempt to parse text as JSON
    try {
      const jsonResponse = JSON.parse(result.content);
      processResponse(jsonResponse);
    } catch (error) {
      // Handle parsing error
    }
  }
  ```

- For CHAT (natural text):
  ```javascript
  // Send the text response directly to Slack
  await sendSlackMessage({
    channel,
    thread_ts,
    text: result.content
  });
  ```

## Production Considerations

When implementing this architecture in production:

1. **Error Handling**: Add retries for transient failures
2. **Monitoring**: Add logging and metrics for assistant performance
3. **Thread Management**: Implement thread cleanup for old conversations
4. **Security**: Safely store and rotate API keys
5. **Rate Limiting**: Handle OpenAI API rate limits gracefully
6. **Cost Management**: Monitor token usage to control costs

## Next Steps

To complete the implementation:

1. Implement actual API calls for Gmail, Slack, and Trello
2. Set up a database for thread persistence
3. Create deployment configuration in netlify.toml
4. Add monitoring and alerting
5. Implement unit and integration tests