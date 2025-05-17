# Thread Mapping Service with Netlify Blobs

This documentation covers the Thread Mapping Service implemented using Netlify Functions and Netlify Blob Storage. The service maps OpenAI Assistant thread IDs to Slack thread IDs and provides both API endpoints and scheduled maintenance.

## Overview

The repository contains two example functions:

1. `netlify-cron-blob-example.js`: Provides API for storing and retrieving OpenAI-to-Slack thread mappings, with automated cleanup via a scheduled job
2. `test-netlify-blob.js`: A simple function for testing and verifying Netlify Blob Storage functionality

## Configuration

### 1. Netlify.toml Configuration

The cron job schedule is configured in the `netlify.toml` file:

```toml
# Cron job example - runs once per hour
[functions.netlify-cron-blob-example]
  schedule = "0 * * * *"
```

The schedule follows standard cron syntax:
- `0 * * * *` - Run once per hour at minute 0
- You can modify this pattern to change the schedule as needed

### 2. Dependencies

Required npm packages:
- `@netlify/blobs`: Netlify's official client for Blob Storage
- `node-fetch`: Used for HTTP requests within the functions

## Functions Usage

### Test Netlify Blob Storage

The `test-netlify-blob.js` function can be used to verify that blob storage is working correctly.

#### Endpoints:

1. **List all blobs**
   - Method: GET
   - URL: `/.netlify/functions/test-netlify-blob`
   - Response: List of all blobs in the "test-store"

2. **Get a specific blob**
   - Method: GET
   - URL: `/.netlify/functions/test-netlify-blob?key=<key>`
   - Response: Content of the blob with the specified key

3. **Store a blob**
   - Method: POST
   - URL: `/.netlify/functions/test-netlify-blob`
   - Body: `{ "key": "my-key", "value": "my-value" }` or `{ "key": "my-key", "value": { "json": "object" } }`
   - Response: Confirmation message with the stored key

### Thread Mapping Service

The `netlify-cron-blob-example.js` function implements a complete thread mapping service with bidirectional lookups and automated cleanup.

#### Scheduled Execution

When triggered by the Netlify cron scheduler:
1. Lists all existing thread mappings
2. Creates sample mappings for demonstration if fewer than 3 exist
3. Checks each mapping's age and deletes mappings older than 30 hours
4. Returns metrics on total mappings, cleaned mappings, etc.

#### API Endpoints:

1. **List all thread mappings**
   - Method: GET
   - URL: `/.netlify/functions/netlify-cron-blob-example`
   - Response: List of all thread mappings in the "thread-mappings" store

2. **Get mapping by OpenAI Thread ID**
   - Method: GET
   - URL: `/.netlify/functions/netlify-cron-blob-example?openAiThreadId=<thread_id>`
   - Response: Thread mapping with the associated Slack Thread ID

3. **Get mapping by Slack Thread ID**
   - Method: GET
   - URL: `/.netlify/functions/netlify-cron-blob-example?slackThreadId=<thread_id>`
   - Response: Thread mapping with the associated OpenAI Thread ID

4. **Create new thread mapping**
   - Method: POST
   - URL: `/.netlify/functions/netlify-cron-blob-example`
   - No body required (uses hardcoded values for simplicity)
   - Response: Confirmation with the created mapping showing the hardcoded values:
     ```json
     {
       "openAiThreadId": "thread_example123",
       "slackThreadId": "1624553390.123456",
       "userId": "U0123456",
       "channelId": "C0123456"
     }
     ```

5. **Delete mapping by OpenAI Thread ID**
   - Method: DELETE
   - URL: `/.netlify/functions/netlify-cron-blob-example`
   - Body: `{ "openAiThreadId": "thread_abc123" }`
   - Response: Confirmation of deletion with the full deleted mapping

6. **Delete mapping by Slack Thread ID**
   - Method: DELETE
   - URL: `/.netlify/functions/netlify-cron-blob-example`
   - Body: `{ "slackThreadId": "1624553390.123456" }`
   - Response: Confirmation of deletion with the full deleted mapping

## Testing and Verification

To verify that the functions are working correctly:

1. Deploy to Netlify with the required environment variables
2. Test the blob storage functionality:
   ```bash
   # List all blobs
   curl https://your-site.netlify.app/.netlify/functions/test-netlify-blob
   
   # Store a blob
   curl -X POST https://your-site.netlify.app/.netlify/functions/test-netlify-blob \
     -H "Content-Type: application/json" \
     -d '{"key":"test-key","value":"Hello World!"}'
   
   # Retrieve the blob
   curl https://your-site.netlify.app/.netlify/functions/test-netlify-blob?key=test-key
   ```

3. The cron job will run automatically according to the schedule
   - You can check the function logs in the Netlify dashboard
   - You can also manually trigger the function endpoints

## Environment Variables

The functions use these environment variables:
- `SITE_ID`: Automatically set by Netlify
- `NETLIFY_BLOBS_TOKEN`: May be required for some operations, especially in local development

## Local Development

For local development:
1. Install the Netlify CLI: `npm install -g netlify-cli`
2. Run locally with `netlify dev`
3. Note that cron schedules don't work in local development, but you can manually test the function endpoints

### Manual Testing Examples

Here are examples of how to test the thread mapping service locally:

```bash
# List all thread mappings
curl http://localhost:8888/.netlify/functions/netlify-cron-blob-example

# Create a thread mapping (uses hardcoded values)
curl -X POST http://localhost:8888/.netlify/functions/netlify-cron-blob-example

# Using the Netlify CLI
netlify functions:invoke netlify-cron-blob-example  # List all mappings
netlify functions:invoke netlify-cron-blob-example -X POST  # Create a mapping with hardcoded values
netlify functions:invoke netlify-cron-blob-example -H "x-netlify-event: schedule"  # Run the scheduled maintenance

# Get a mapping by OpenAI Thread ID
curl http://localhost:8888/.netlify/functions/netlify-cron-blob-example?openAiThreadId=thread_abc123

# Get a mapping by Slack Thread ID
curl http://localhost:8888/.netlify/functions/netlify-cron-blob-example?slackThreadId=1624553390.123456

# Delete a mapping by OpenAI Thread ID
curl -X DELETE http://localhost:8888/.netlify/functions/netlify-cron-blob-example \
  -H "Content-Type: application/json" \
  -d '{"openAiThreadId":"thread_abc123"}'

# Simulate the scheduled job (cron)
curl -H "x-netlify-event: schedule" http://localhost:8888/.netlify/functions/netlify-cron-blob-example

# Test the basic blob storage function
curl http://localhost:8888/.netlify/functions/test-netlify-blob
```

## Troubleshooting

Common issues that might arise:

1. **Authentication Issues**: If you see "Unauthorized" errors, make sure you have the proper environment variables set:
   ```
   NETLIFY_BLOBS_TOKEN=your_token_here netlify dev
   ```

2. **Module Import Errors**: Ensure you're using the correct version of `@netlify/blobs` package (version 8.1.0 or higher is recommended).

3. **Cron Simulation**: To simulate how the cron job works, you can use:
   ```bash
   # This adds a header that makes the function think it's a scheduled event
   curl -H "x-netlify-event: schedule" http://localhost:8888/.netlify/functions/netlify-cron-blob-example
   ```