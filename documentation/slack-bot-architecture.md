# Slack Bot Architecture

This project includes a Slack bot implementation using Netlify Functions with a pattern that separates immediate responses from background processing:

## Key Components

1. **`functions/slack-events.js`**
   - Entry point for all Slack events
   - Responds within Slack's required 3-second timeout
   - Performs basic validation and security checks
   - Delegates heavy processing to background workers
   - Returns quick acknowledgment to satisfy Slack's requirements

2. **`functions/slack-chat-worker-background.js`**
   - Background worker that handles longer-running tasks
   - Retrieves message thread history
   - Formats messages for OpenAI's API format
   - Sends responses back to the Slack thread
   - Can run without being constrained by Slack's response timeout

3. **`functions/helpers/get-openai-messages-from-slack-thread.js`**
   - Helper utility to fetch thread messages from Slack API
   - Converts Slack message format to OpenAI conversation format
   - Uses GET requests with proper query parameters
   - Handles errors and edge cases gracefully

## Required Environment Variables
- `SLACK_BOT_TOKEN`: OAuth token for the Slack bot
- `SLACK_BOT_USER_ID`: User ID of the bot for message role detection
- `BASE_URL`: Base URL of the deployed application

## Key Slack API Endpoints
- `conversations.replies`: GET request to fetch thread messages
  - Must be a GET request with URL parameters (not POST with JSON body)
  - Required parameters: `channel`, `ts` (thread timestamp)
  - Returns message history for a thread
  
- `chat.postMessage`: POST request to send messages to channels/threads
  - Requires JSON body with `channel`, `text`, and optional `thread_ts`
  - Used to reply to messages or send new messages

## Implementation Pattern

This architecture follows a pattern similar to the "Command-Query Responsibility Segregation" (CQRS) pattern:

1. The `slack-events.js` function:
   - Quickly validates and acknowledges events (within 3 seconds)
   - Offloads the actual processing to a background function
   - Returns 200 OK to Slack to prevent retries

2. The `slack-chat-worker-background.js` function:
   - Handles complex processing without time constraints
   - Retrieves thread history 
   - Formats data for AI processing
   - Sends back responses to Slack
   
This separation allows the system to remain responsive to Slack's webhook timeouts while still performing more complex processing asynchronously.

## Error Handling

The implementation includes robust error handling:
- HTTP error handling (connection issues)
- Slack API error handling (invalid parameters, permissions)
- Missing environment variable checks
- Defensive coding against undefined values