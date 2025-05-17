# Environment Variables

This document lists all environment variables required for the email management system to function correctly. These variables should be configured in your Netlify environment or `.env` file for local development.

## OpenAI API Configuration

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for accessing the API |
| `HI_OPENAI_ASSISTENT_ID` | Assistant ID for the Handle-Inbox (HI) assistant |
| `DARE_OPENAI_ASSISTENT_ID` | Assistant ID for the Daily-Report (DARE) assistant |
| `CHAT_OPENAI_ASSISTENT_ID` | Assistant ID for the Chat assistant |

## Gmail API Configuration

| Variable | Description |
|----------|-------------|
| `VITE_GMAIL_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GMAIL_CLIENT_SECRET` | OAuth client secret from Google Cloud Console |
| `GMAIL_REFRESH_TOKEN` | OAuth refresh token for Gmail API access |
| `GMAIL_TOKEN_URI` | Google OAuth token endpoint |
| `VITE_GMAIL_REDIRECT_URI` | Redirect URI for OAuth flow |
| `GMAIL_BOOKKEEPING_EMAIL` | Email address for forwarding invoices |

## Slack API Configuration

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | OAuth token for the Slack bot |
| `SLACK_BOT_USER_ID` | User ID of the bot for message role detection |
| `SLACK_WEBHOOK_URL` | Webhook URL for sending notifications (optional) |
| `SLACK_NOTIFICATION_CHANNEL` | Slack channel ID for notifications |

## Trello API Configuration

| Variable | Description |
|----------|-------------|
| `TRELLO_API_KEY` | Trello API key from developer portal |
| `TRELLO_API_TOKEN` | Trello API token for authentication |
| `TRELLO_INBOX_LIST_ID` | ID of the "Getting Things Done" Trello list |

## Netlify Configuration

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Base URL of your Netlify deployment |
| `NETLIFY_BLOBS_SIGNING_KEY` | Signing key for Netlify Blobs (thread storage) |

## Application Configuration

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment mode (development/production) |
| `TZ` | Timezone for date/time operations |

## Setting Up Environment Variables

### For Local Development

Create a `.env` file in the root directory with all required variables.

### For Netlify Deployment

1. Go to the Netlify dashboard for your site
2. Navigate to Site settings > Build & deploy > Environment
3. Add each variable individually
4. Re-deploy your site after adding all variables

## Environment Variable Validation

The application validates required environment variables on startup. Missing variables will cause appropriate error messages to be logged, helping to troubleshoot configuration issues.

## Security Considerations

- Never commit environment variables to your repository
- Rotate API keys and tokens periodically for security
- Use Netlify's environment variable encryption for sensitive values
- Consider using a more robust secrets management solution for production