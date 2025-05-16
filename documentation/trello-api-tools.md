# Trello API Integration Documentation

## Authentication

Based on the `test-trello.js` file, authentication for Trello API is handled through API keys and tokens:

1. **Trello API Credentials**:
   - **API Key**: Stored in environment variable `TRELLO_API_KEY`
   - **API Token**: Stored in environment variable `TRELLO_API_TOKEN`
   - **List ID**: Stored in environment variable `TRELLO_INBOX_LIST_ID` (identifies the "Getting Things Done" board's list)

2. **Authentication Method**:
   - Trello uses a simple key-token authentication pattern
   - API key and token are included as query parameters in API requests
   - Format: `?key=${trelloApiKey}&token=${trelloApiToken}`

3. **Security Considerations**:
   - The API key and token should always be stored securely in environment variables
   - Never expose these credentials in client-side code

## Trello Tools for OpenAI Assistant

Based on the README workflow scenarios, the OpenAI Assistant will need the following Trello API tool:

### TrelloCardCreation Tool
- **Purpose**: Create new cards in the Getting Things Done board
- **Functionality**:
  - Create cards with a title and description
  - Place cards in the proper list (using the list ID)
- **Use Cases**:
  - Create tasks from urgent email notifications
  - Create tasks based on boss requests via Slack
  - Create tasks for drafting LinkedIn posts about topics discussed with the boss
- **API Endpoint**: `https://api.trello.com/1/cards`
- **Required Parameters**:
  - `idList`: The ID of the list to add the card to
  - `name`: The title of the card
  - `desc`: The description of the card
- **Authentication**: API key and token as query parameters

## Specific Use Cases from README

1. **Urgent Email Notifications**:
   ```
   For (system) Notifications: the HI assistent should be able to estimate the notification as 'urgent' or 'important-not-urgent' or 'irrelevant' based on sender and content. Urgent matters require a direct notification in the Slack Channel with an offer to add this as item in the Getting Things Done trello board.
   ```
   - The assistant needs to create a Trello card for urgent matters if the boss agrees via Slack
   - Tool: TrelloCardCreation

2. **Tasks from Chat**:
   ```
   The boss can talk deeply with the CHAT assistent about a topic or email. The CHAT assistent can create Trello Items in the boss's Getting Things Done board, for example to draft a LinkedIn post for the boss about the discussed topic.
   ```
   - The assistant needs to create a Trello card based on conversation topics
   - Tool: TrelloCardCreation

3. **Action on Emails**:
   ```
   When the boss says he want to act on a certain email, the CHAT assistent creates a trello item in the Getting Things Done board
   ```
   - The assistant needs to create a Trello card for emails the boss wants to act on
   - Tool: TrelloCardCreation

## Implementation Example

Based on the `test-trello.js` file, here's a template for implementing Trello API calls:

```javascript
async function createTrelloCard(name, description) {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloApiToken = process.env.TRELLO_API_TOKEN;
  const trelloInboxListId = process.env.TRELLO_INBOX_LIST_ID;

  const response = await fetch(
    `https://api.trello.com/1/cards?idList=${trelloInboxListId}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(description)}&key=${trelloApiKey}&token=${trelloApiToken}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create Trello card: ${response.status} - ${text}`);
  }

  return await response.json();
}
```

## Implementation Notes

1. Always URL-encode parameters (especially card name and description) to prevent API errors
2. Include proper error handling with detailed error messages
3. Consider implementing card search functionality to avoid creating duplicate tasks
4. Respect the Trello API rate limits
5. Consider implementing a function to handle various Trello API operations with a consistent error handling approach