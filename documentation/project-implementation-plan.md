# Email Management System Implementation Plan

This document outlines the development approach for implementing the Gmail inbox management system with three OpenAI Assistants (HI, DARE, and CHAT). This plan is specifically designed for Claude Code to follow during implementation.

## Project Overview

We're building a system that:
1. Processes emails in Gmail inbox (HI Assistant)
2. Creates daily digests of important content (DARE Assistant)
3. Allows interactive management via Slack (CHAT Assistant)

All three assistants have different configurations and capabilities as documented in `openai-assistant-implementation.md`.

## Development Approach

Our implementation approach follows these principles:
1. Test-driven development (writing tests first)
2. Modular architecture with shared components
3. Clear separation between API tools and AI assistant logic
4. Direct implementation of routine tasks without AI when appropriate
5. Persistent storage only when absolutely necessary (Netlify Blobs)

## Implementation Phases

### Phase 1: Core Infrastructure & Testing Framework

1. **Testing Framework Setup**
   - Create `/test` directory with Jest configuration
   - Set up mock data for Gmail, Slack, and Trello APIs
   - Create test utilities for OpenAI Assistant mocking

2. **Core API Client Implementation**
   - Gmail API client with authentication
   - Slack API client for messaging
   - Trello API client for card creation

3. **OpenAI Assistant Core Module**
   - Refine and test the `openai-assistant.js` module
   - Implement thread management
   - Test response handling (JSON & text formats)

### Phase 2: Tool Implementation

1. **Gmail API Tools**
   - Email retrieval and filtering
   - Email labeling
   - Email archiving
   - Email forwarding
   - Draft creation
   - Attachment handling
   - Unsubscribe link extraction

2. **Slack API Tools**
   - Message sending
   - Thread retrieval & formatting
   - Conversation context management

3. **Trello API Tools**
   - Card creation
   - Basic card management

4. **System Prompt Management**
   - Tool for updating system prompts

### Phase 3: Workflow Implementation

1. **HI Assistant Implementation**
   - Email processing logic
   - Email categorization
   - Rules-based decision making
   - Tool integration

2. **DARE Assistant Implementation**
   - Email summary generation
   - Content formatting for Slack
   - Report generation

3. **CHAT Assistant Implementation**
   - Conversation handling
   - Thread persistence
   - Multi-tool integration
   - Complex action handling

### Phase 4: Integration & Testing

1. **End-to-End Testing**
   - Integration test for each workflow
   - Error handling tests
   - Edge case testing

2. **Deployment Configuration**
   - Netlify function configuration
   - Environment variable setup
   - Scheduled function triggers

## Detailed Task Breakdown

### 1. Testing Framework

```javascript
// Example test structure for Gmail API tools
test('retrieves unprocessed emails', async () => {
  // Setup mock data
  mockGmailAPI.setupEmailListResponse([/* mock emails */]);
  
  // Call the function
  const result = await getUnprocessedEmails();
  
  // Assertions
  expect(result.length).toBe(2);
  expect(result[0].id).toBe('email-1');
  expect(mockGmailAPI.calls.list).toHaveBeenCalledWith({
    q: '-label:processed-by-hi label:inbox'
  });
});
```

### 2. Tool Implementation

We'll implement the following tools:

#### Gmail Tools
- `getUnprocessedEmails`: Retrieve emails without "processed by HI" label
- `getEmailsToSummarize`: Get emails with "to-summarize" label from last 24h
- `labelEmail`: Add/remove labels to emails
- `archiveEmail`: Move email to archive
- `forwardEmail`: Forward email to another address
- `createDraft`: Create draft reply
- `getUnsubscribeLink`: Extract unsubscribe link from email

#### Slack Tools
- `sendSlackMessage`: Send message to Slack channel/thread
- `getSlackThread`: Get thread history
- `formatAsOpenAIMessages`: Convert Slack messages to OpenAI format

#### Trello Tools
- `createTrelloCard`: Create card in GTD board

#### System Tools
- `updateSystemPrompt`: Update an assistant's system prompt

### 3. Critical Thinking About AI Usage

Based on the workflows, here's where we should use AI vs. direct implementation:

#### Use AI Assistant For:
- **Email categorization**: Determining email importance and type
- **Email summarization**: Creating concise summaries for daily reports
- **Draft suggestions**: Creating human-like draft responses
- **Chat interaction**: Handling back-and-forth conversations
- **System prompt improvement**: Learning from feedback

#### Direct Implementation (No AI):
- **Email archiving**: Simple rule-based logic (age + label)
- **Label application**: Direct application after decisions are made
- **Email retrieval**: Query-based filtering
- **Unsubscribe extraction**: Regular expression or HTML parsing 
- **Thread management**: Storage and retrieval of thread IDs

### 4. Thread Persistence Requirements

The CHAT assistant is the only workflow requiring persistence between sessions. We'll use Netlify Blobs for this minimal storage need:

```javascript
// Thread storage interface
class ThreadStorage {
  constructor() {
    this.netlifyBlobsClient = createNetlifyBlobsClient();
  }

  async getThreadId(channel, thread_ts) {
    const key = `slack-thread:${channel}:${thread_ts}`;
    try {
      const blob = await this.netlifyBlobsClient.get(key);
      return blob.json();
    } catch (error) {
      return null;
    }
  }
  
  async storeThreadId(channel, thread_ts, threadId) {
    const key = `slack-thread:${channel}:${thread_ts}`;
    await this.netlifyBlobsClient.set(key, JSON.stringify({ threadId }));
    return true;
  }
}
```

## Detailed Testing Plan

### Unit Tests
- **API Clients**: Test authentication, API calls, error handling
- **Tool Functions**: Test each tool with various inputs and mock responses
- **Assistant Core**: Test thread creation, message handling, response parsing

### Integration Tests
- **HI Assistant Flow**: Test complete email processing workflow
- **DARE Assistant Flow**: Test summary generation workflow
- **CHAT Assistant Flow**: Test conversation workflow

### Mock Data
- Create comprehensive mock data for Gmail, Slack, and Trello
- Include edge cases like malformed emails, error responses

## Implementation Guidelines for Claude Code

1. **Implementation Order**:
   - First implement tests for each component
   - Then implement the underlying functionality
   - Follow the phase order (infrastructure → tools → workflows)

2. **Error Handling**:
   - Every external API call should have try/catch blocks
   - Log errors with descriptive messages
   - Handle recoverable errors gracefully

3. **Code Organization**:
   - Keep all API tools in `/functions/tools/` 
   - Core assistant in `/functions/helpers/openai-assistant.js`
   - Assistant workflows in `/functions/hi-assistant.js`, etc.

4. **Dependency Management**:
   - Reuse existing npm packages (fetch, etc.)
   - Add minimal new dependencies if needed

5. **Environment Variables**:
   - Document all required environment variables
   - Add validation for required variables

## Implementation Timeline

1. **Phase 1: Core Infrastructure** - 1 day
2. **Phase 2: Tool Implementation** - 2 days  
3. **Phase 3: Workflow Implementation** - 2 days
4. **Phase 4: Integration & Testing** - 1 day

Total estimated implementation time: 6 days

## Next Steps

1. Begin with test implementation for core components
2. Implement shared OpenAI Assistant class
3. Build and test API clients 
4. Implement workflow-specific functionality
5. Perform integration testing

## Critical Success Factors

1. **Robust Error Handling**: The system must gracefully handle API errors, rate limits, and edge cases
2. **Thread Persistence**: CHAT assistant must maintain conversation context
3. **Security**: Proper handling of credentials and sensitive data
4. **Performance**: Quick response times for user interactions
5. **Modular Design**: Clean separation of concerns for maintainability