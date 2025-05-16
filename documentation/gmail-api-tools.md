# Gmail API Integration Documentation

## Authentication Flow

Based on the codebase analysis, this project uses OAuth 2.0 to authenticate with the Gmail API. The implementation requires:

1. **OAuth 2.0 Credentials Setup**:
   - Client ID and Client Secret from Google Cloud Console
   - A refresh token to generate access tokens

2. **Access Token Generation**:
   - The helper function `getGmailAccessToken()` in `functions/helpers/gmail-get-access-token.js` handles this
   - It uses the refresh token to request a new access token from Google's OAuth endpoint
   - The refresh token is stored in environment variables (`GMAIL_REFRESH_TOKEN`)
   - Client credentials are also stored in environment variables (`VITE_GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`)

3. **Token Usage**:
   - The access token is included in the Authorization header for all Gmail API requests
   - Format: `Authorization: Bearer ${accessToken}`

## Gmail Tools for OpenAI Assistant

Based on the README workflow scenarios, the OpenAI Assistant will need the following Gmail API tools:

### 1. InboxRetrieval Tool
- **Purpose**: Fetch emails from the inbox with specific filters
- **Functionality**:
  - Retrieve emails without "processed by HI" label
  - Filter by date range
  - Get email content, headers, and attachments
- **API Endpoint**: `https://gmail.googleapis.com/gmail/v1/users/me/messages`

### 2. EmailLabeling Tool
- **Purpose**: Add/remove labels on emails
- **Functionality**:
  - Add "processed by HI" after processing
  - Add "to-summarize" for newsletters
  - Add "archive-in-X-days" for content to be archived later
- **API Endpoint**: `https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/modify`

### 3. EmailArchiving Tool
- **Purpose**: Move emails from inbox to archive
- **Functionality**:
  - Retrieve items with "archive-in-x-days" label older than x days
  - Move them to archive by removing INBOX label
- **API Endpoint**: `https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/modify`

### 4. EmailForwarding Tool
- **Purpose**: Forward emails to another address
- **Functionality**:
  - Forward invoice attachments to bookkeeping email
- **API Endpoint**: Uses message creation and sending endpoints

### 5. DraftCreation Tool
- **Purpose**: Create draft responses for important emails
- **Functionality**:
  - Set "short and sweet" draft responses for customer emails
- **API Endpoint**: `https://gmail.googleapis.com/gmail/v1/users/me/drafts`

### 6. AttachmentHandling Tool
- **Purpose**: Process attachments when needed
- **Functionality**:
  - Access attachments for emails identified as invoices (based on email content/subject)
  - Forward these attachments to bookkeeping email
- **API Endpoint**: `https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/attachments/{attachmentId}`
- **Note**: Invoice identification would be based on email content analysis, not attachment scanning

### 7. EmailCategorization Tool
- **Purpose**: Analyze email content to categorize its importance
- **Functionality**:
  - Categorize notifications as "urgent", "important-not-urgent", or "irrelevant"
  - Identify newsletters (which aren't attachments but a type of email content)
  - Identify customer emails and other important communications
- **Note**: This is more of a logical tool that uses content analysis rather than a direct Gmail API call
- **API Dependency**: Relies on full message content from `https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}`

### 8. UnsubscribeLink Tool
- **Purpose**: Extract unsubscribe links from emails
- **Functionality**:
  - Find and extract unsubscribe links from newsletters
  - Make them available to the boss via Slack
- **Note**: This requires parsing email content rather than a direct Gmail API endpoint

## Implementation Notes

1. All tools should use the authentication helper to get a valid access token
2. Tools should handle error cases gracefully
3. Rate limiting should be considered for batch operations
4. Tools should implement proper logging for troubleshooting
5. Each tool should verify the response from Gmail API and handle failures appropriately

## Example Usage Pattern

```javascript
const accessToken = await getGmailAccessToken();
const apiResponse = await fetch('https://gmail.googleapis.com/gmail/v1/[endpoint]', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

if (!apiResponse.ok) {
  // Handle error
}

const responseData = await apiResponse.json();
// Process the response data
```