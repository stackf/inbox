# Assistant Tools Documentation

This document describes all tools available to the OpenAI Assistants in this project. These tools allow the assistants to interact with Gmail, Slack, and Trello to automate email handling, notifications, and task management.

## Tools Architecture

All tools are implemented as Netlify serverless functions, with a central dispatcher (`tool-call.js`) that routes requests to the appropriate function handler.

### Usage Pattern

When OpenAI Assistants need to call a tool, they make a request to:

```
https://your-netlify-site.netlify.app/.netlify/functions/tool-call
```

With a JSON payload like:

```json
{
  "function_name": "name_of_function",
  "arguments": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

## Gmail API Tools

### `gmail_inbox_retrieval`

Retrieves emails from the inbox with optional filters.

**Parameters:**
- `labelFilter` (array): Array of label strings. Prefix with "!" to exclude.
- `maxResults` (number): Maximum number of emails to retrieve.
- `includeContent` (boolean): Whether to include full message content.

**Example:**
```json
{
  "function_name": "gmail_inbox_retrieval",
  "arguments": {
    "labelFilter": ["!processed by HI", "INBOX"],
    "maxResults": 10,
    "includeContent": false
  }
}
```

### `gmail_label_email`

Adds or removes labels from an email.

**Parameters:**
- `messageId` (string): The ID of the email.
- `addLabelIds` (array): Labels to add.
- `removeLabelIds` (array): Labels to remove.

**Example:**
```json
{
  "function_name": "gmail_label_email",
  "arguments": {
    "messageId": "18c42b37a9a8e8c1",
    "addLabelIds": ["processed by HI", "to-summarize"],
    "removeLabelIds": []
  }
}
```

### `gmail_archive_email`

Archives an email (removes from inbox).

**Parameters:**
- `messageId` (string): The ID of the email.

**Example:**
```json
{
  "function_name": "gmail_archive_email",
  "arguments": {
    "messageId": "18c42b37a9a8e8c1"
  }
}
```

### `gmail_forward_email`

Forwards an email to another address.

**Parameters:**
- `messageId` (string): The ID of the email to forward.
- `to` (string): Email address to forward to.
- `subject` (string, optional): Custom subject line.
- `additionalContent` (string, optional): Custom text to add to the forwarded message.

**Example:**
```json
{
  "function_name": "gmail_forward_email",
  "arguments": {
    "messageId": "18c42b37a9a8e8c1",
    "to": "bookkeeping@example.com",
    "subject": "Invoice for processing",
    "additionalContent": "This is an invoice that needs to be processed."
  }
}
```

### `gmail_create_draft`

Creates a draft reply to an email.

**Parameters:**
- `messageId` (string): The ID of the email to reply to.
- `content` (string): Draft response content.

**Example:**
```json
{
  "function_name": "gmail_create_draft",
  "arguments": {
    "messageId": "18c42b37a9a8e8c1",
    "content": "Thank you for your email. I'll look into this and get back to you soon."
  }
}
```

### `gmail_get_message`

Gets the full content of an email.

**Parameters:**
- `messageId` (string): The ID of the email.

**Example:**
```json
{
  "function_name": "gmail_get_message",
  "arguments": {
    "messageId": "18c42b37a9a8e8c1"
  }
}
```

### `gmail_get_attachment`

Gets an attachment from an email.

**Parameters:**
- `messageId` (string): The ID of the email.
- `attachmentId` (string): The ID of the attachment.

**Example:**
```json
{
  "function_name": "gmail_get_attachment",
  "arguments": {
    "messageId": "18c42b37a9a8e8c1",
    "attachmentId": "ANGjdJ8hM6fG5kJlwef_aCjD-vmN"
  }
}
```

### `gmail_search_unsubscribe_link`

Searches an email for an unsubscribe link.

**Parameters:**
- `messageId` (string): The ID of the email.

**Example:**
```json
{
  "function_name": "gmail_search_unsubscribe_link",
  "arguments": {
    "messageId": "18c42b37a9a8e8c1"
  }
}
```

## Slack API Tools

### `slack_send_message`

Sends a message to a Slack channel or thread.

**Parameters:**
- `channel` (string): The channel ID.
- `text` (string): Message text.
- `threadTs` (string, optional): Thread timestamp to reply to.

**Example:**
```json
{
  "function_name": "slack_send_message",
  "arguments": {
    "channel": "C04UJKR8CS3",
    "text": "Important email from customer received!",
    "threadTs": "1621234567.123456"
  }
}
```

### `slack_get_thread_history`

Gets the message history from a Slack thread.

**Parameters:**
- `channel` (string): The channel ID.
- `threadTs` (string): Thread timestamp.

**Example:**
```json
{
  "function_name": "slack_get_thread_history",
  "arguments": {
    "channel": "C04UJKR8CS3",
    "threadTs": "1621234567.123456"
  }
}
```

## Trello API Tools

### `trello_create_card`

Creates a card in the Trello board.

**Parameters:**
- `name` (string): Card title.
- `description` (string): Card description.
- `listId` (string, optional): List ID to add card to (default: inbox list).

**Example:**
```json
{
  "function_name": "trello_create_card",
  "arguments": {
    "name": "Draft LinkedIn post about AI assistants",
    "description": "Create a LinkedIn post discussing how we use AI assistants to manage emails and automate tasks."
  }
}
```

## System Prompt Management Tools

### `update_system_prompt`

Updates a system prompt for an assistant.

**Parameters:**
- `assistant` (string): Assistant to update ("hi", "dare", or "chat").
- `promptUpdate` (object): Update details.
  - `mode` (string): "append", "replace", or "full".
  - `search` (string, optional): Text to replace (for replace mode).
  - `content` (string): New content.

**Example:**
```json
{
  "function_name": "update_system_prompt",
  "arguments": {
    "assistant": "hi",
    "promptUpdate": {
      "mode": "append",
      "content": "Always flag emails from example@domain.com as customer emails."
    }
  }
}
```

## Special Tools

### `archive_old_emails`

Archives emails with "archive-in-x-days" label that are older than x days.

**Parameters:**
- `days` (number): Number of days.

**Example:**
```json
{
  "function_name": "archive_old_emails",
  "arguments": {
    "days": 3
  }
}
```

## Error Handling

All tools return a consistent error format:

```json
{
  "error": "Error message details"
}
```

## Authentication

All tools handle authentication internally using environment variables:

- Gmail: `GMAIL_REFRESH_TOKEN`, `VITE_GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`
- Slack: `SLACK_BOT_TOKEN`, `SLACK_BOT_USER_ID`
- Trello: `TRELLO_API_KEY`, `TRELLO_API_TOKEN`, `TRELLO_INBOX_LIST_ID`