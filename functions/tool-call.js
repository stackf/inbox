// Import required helpers
const getGmailAccessToken = require('./helpers/gmail-get-access-token');
const getOpenAIMessagesFromSlackThread = require('./helpers/get-openai-messages-from-slack-thread');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

/**
 * Gmail API Functions
 */

// Retrieve emails from inbox with optional filters
async function gmailInboxRetrieval(labelFilter = [], maxResults = 10, includeContent = false) {
  try {
    const accessToken = await getGmailAccessToken();
    
    // Build query params
    const queryParams = new URLSearchParams();
    if (maxResults) queryParams.append('maxResults', maxResults);
    
    // Add label filter if provided
    let q = '';
    if (labelFilter && labelFilter.length > 0) {
      // For emails without the processed label
      if (labelFilter.some(label => label.startsWith('!'))) {
        const excludeLabels = labelFilter.filter(label => label.startsWith('!')).map(label => label.substring(1));
        excludeLabels.forEach(label => {
          q += `-label:${label} `;
        });
      }
      
      // For emails with specific labels
      const includeLabels = labelFilter.filter(label => !label.startsWith('!'));
      includeLabels.forEach(label => {
        q += `label:${label} `;
      });
      
      if (q) {
        queryParams.append('q', q.trim());
      }
    }
    
    // Get message list
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams.toString()}`;
    const listResponse = await fetch(listUrl, {
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
    
    // If content is not needed, return just the IDs
    if (!includeContent) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          messages: messages.map(msg => ({ id: msg.id, threadId: msg.threadId })),
          resultSizeEstimate: listData.resultSizeEstimate,
        }),
      };
    }
    
    // If content is needed, fetch each message
    const fullMessages = await Promise.all(
      messages.map(async (msg) => {
        const messageData = await gmailGetMessage({ messageId: msg.id });
        return JSON.parse(messageData.body);
      })
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        messages: fullMessages,
        resultSizeEstimate: listData.resultSizeEstimate,
      }),
    };
  } catch (error) {
    console.error('Error retrieving inbox:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Add/remove labels on an email
async function gmailLabelEmail(messageId, addLabelIds = [], removeLabelIds = []) {
  try {
    const accessToken = await getGmailAccessToken();
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds,
        removeLabelIds,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to modify labels: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.id,
        threadId: data.threadId,
        labelIds: data.labelIds,
      }),
    };
  } catch (error) {
    console.error('Error modifying labels:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Archive an email (remove INBOX label)
async function gmailArchiveEmail(messageId) {
  return await gmailLabelEmail(messageId, [], ['INBOX']);
}

// Forward an email to another address
async function gmailForwardEmail(messageId, to, subject, additionalContent = '') {
  try {
    const accessToken = await getGmailAccessToken();
    
    // First, get the email content
    const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      throw new Error(`Failed to fetch email content: ${messageResponse.status} - ${errorText}`);
    }
    
    const messageData = await messageResponse.json();
    
    // Extract email parts and headers
    const headers = messageData.payload.headers;
    const originalFrom = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
    const originalSubject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
    
    // Create forwarded message
    const forwardSubject = subject || `Fwd: ${originalSubject}`;
    const forwardIntro = `---------- Forwarded message ---------\nFrom: ${originalFrom}\nSubject: ${originalSubject}\n\n`;
    
    // Get email body
    let emailBody = '';
    function extractBody(part) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        for (const subPart of part.parts) {
          const body = extractBody(subPart);
          if (body) return body;
        }
      }
      return '';
    }
    
    emailBody = extractBody(messageData.payload);
    
    // Combine everything
    const forwardBody = `${additionalContent}\n\n${forwardIntro}${emailBody}`;
    
    // Create a draft with the forwarded content
    const createDraftResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          raw: Buffer.from(
            `To: ${to}\r\n` +
            `Subject: ${forwardSubject}\r\n` +
            `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
            `${forwardBody}`
          ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
      }),
    });
    
    if (!createDraftResponse.ok) {
      const errorText = await createDraftResponse.text();
      throw new Error(`Failed to create draft: ${createDraftResponse.status} - ${errorText}`);
    }
    
    const draftData = await createDraftResponse.json();
    
    // Send the draft as an email
    const sendResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${draftData.id}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      throw new Error(`Failed to send email: ${sendResponse.status} - ${errorText}`);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Email forwarded to ${to}`,
      }),
    };
  } catch (error) {
    console.error('Error forwarding email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Create a draft response
async function gmailCreateDraft(messageId, content) {
  try {
    const accessToken = await getGmailAccessToken();
    
    // First, get the email we're replying to
    const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      throw new Error(`Failed to fetch email content: ${messageResponse.status} - ${errorText}`);
    }
    
    const messageData = await messageResponse.json();
    
    // Extract headers
    const headers = messageData.payload.headers;
    const threadId = messageData.threadId;
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '';
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
    
    // Extract email address from the From header
    const emailRegex = /<([^>]+)>|([^\s<]+@[^\s>]+)/;
    const match = from.match(emailRegex);
    const toEmail = match ? match[1] || match[2] : '';
    
    if (!toEmail) {
      throw new Error('Could not extract email address from the From header');
    }
    
    // Create reply draft
    const replyPrefix = subject.toLowerCase().startsWith('re:') ? '' : 'Re: ';
    const replySubject = `${replyPrefix}${subject}`;
    
    const createDraftResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          threadId,
          raw: Buffer.from(
            `To: ${toEmail}\r\n` +
            `Subject: ${replySubject}\r\n` +
            `In-Reply-To: ${messageId}\r\n` +
            `References: ${messageId}\r\n` +
            `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
            `${content}`
          ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
      }),
    });
    
    if (!createDraftResponse.ok) {
      const errorText = await createDraftResponse.text();
      throw new Error(`Failed to create draft: ${createDraftResponse.status} - ${errorText}`);
    }
    
    const draftData = await createDraftResponse.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        draftId: draftData.id,
        message: 'Draft created successfully',
      }),
    };
  } catch (error) {
    console.error('Error creating draft:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Get full message content
async function gmailGetMessage(messageId) {
  try {
    const accessToken = await getGmailAccessToken();
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch message: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Process the message to extract readable content
    const headers = {};
    data.payload.headers.forEach(header => {
      headers[header.name.toLowerCase()] = header.value;
    });
    
    // Extract body content
    let body = '';
    let attachments = [];
    
    function processPart(part, depth = 0) {
      if (part.mimeType === 'text/plain' && part.body.data) {
        if (depth <= 1) { // Only use top-level or immediate child text parts
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      } else if (part.mimeType === 'text/html' && part.body.data && body === '') {
        // Use HTML if plain text is not available, but strip tags
        const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
        body = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else if (part.filename && part.body.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size
        });
      }
      
      if (part.parts) {
        part.parts.forEach(subPart => processPart(subPart, depth + 1));
      }
    }
    
    processPart(data.payload);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.id,
        threadId: data.threadId,
        labelIds: data.labelIds,
        snippet: data.snippet,
        internalDate: data.internalDate,
        headers,
        body,
        attachments,
        raw: data // Include raw data for advanced processing
      }),
    };
  } catch (error) {
    console.error('Error getting message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Get attachment from email
async function gmailGetAttachment(messageId, attachmentId) {
  try {
    const accessToken = await getGmailAccessToken();
    
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch attachment: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        attachmentId: attachmentId,
        size: data.size,
        data: data.data // Base64 encoded data
      }),
    };
  } catch (error) {
    console.error('Error getting attachment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Search for unsubscribe link in email
async function gmailSearchUnsubscribeLink(messageId) {
  try {
    const accessToken = await getGmailAccessToken();
    
    // Get the email
    const messageResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      throw new Error(`Failed to fetch message: ${messageResponse.status} - ${errorText}`);
    }
    
    const messageData = await messageResponse.json();
    
    // Check headers for List-Unsubscribe
    let unsubscribeUrl = null;
    const listUnsubscribe = messageData.payload.headers.find(
      header => header.name.toLowerCase() === 'list-unsubscribe'
    );
    
    if (listUnsubscribe) {
      // Extract URL from List-Unsubscribe header
      // Format could be <http://example.com/unsubscribe>, <mailto:...>
      const matches = listUnsubscribe.value.match(/<(https?:\/\/[^>]+)>/);
      if (matches && matches[1]) {
        unsubscribeUrl = matches[1];
      }
    }
    
    // If not found in headers, try to find in body
    if (!unsubscribeUrl) {
      // Extract HTML content
      let htmlContent = '';
      
      function findHtmlPart(part) {
        if (part.mimeType === 'text/html' && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          for (const subPart of part.parts) {
            const html = findHtmlPart(subPart);
            if (html) return html;
          }
        }
        return null;
      }
      
      htmlContent = findHtmlPart(messageData.payload) || '';
      
      // Common patterns for unsubscribe links
      const patterns = [
        /href=["'](https?:\/\/[^"']*unsubscribe[^"']*)["']/i,
        /href=["'](https?:\/\/[^"']*opt[_-]out[^"']*)["']/i,
        /href=["'](https?:\/\/[^"']*optout[^"']*)["']/i,
        /href=["'](https?:\/\/[^"']*remove[^"']*)["']/i,
      ];
      
      for (const pattern of patterns) {
        const match = htmlContent.match(pattern);
        if (match && match[1]) {
          unsubscribeUrl = match[1];
          break;
        }
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        messageId,
        unsubscribeUrl,
        found: !!unsubscribeUrl
      }),
    };
  } catch (error) {
    console.error('Error searching for unsubscribe link:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Archive emails labeled with archive-in-x-days that are older than x days
async function archiveOldEmails(days = 3) {
  try {
    const accessToken = await getGmailAccessToken();
    
    // Calculate the timestamp for 'days' ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    const timestamp = Math.floor(daysAgo.getTime() / 1000);
    
    // Get emails with archive-in-x-days label
    const queryParams = new URLSearchParams();
    queryParams.append('q', `label:archive-in-${days}-days before:${timestamp}`);
    
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
    
    // Archive each message
    const results = await Promise.all(
      messages.map(async (msg) => {
        const archiveResult = await gmailArchiveEmail(msg.id);
        return {
          messageId: msg.id,
          success: archiveResult.statusCode === 200
        };
      })
    );
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        archivedCount: results.filter(r => r.success).length,
        totalFound: messages.length,
        results
      }),
    };
  } catch (error) {
    console.error('Error archiving old emails:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

/**
 * Slack API Functions
 */

// Send message to Slack channel
async function slackSendMessage(channel, text, threadTs = null) {
  try {
    const requestBody = {
      channel,
      text,
    };
    
    // Add thread_ts if replying to a thread
    if (threadTs) {
      requestBody.thread_ts = threadTs;
    }
    
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send Slack message: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error}`);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ts: data.ts,
        channel: data.channel
      }),
    };
  } catch (error) {
    console.error('Error sending Slack message:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Get thread history from Slack
async function slackGetThreadHistory(channel, threadTs) {
  try {
    const messages = await getOpenAIMessagesFromSlackThread(channel, threadTs);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        messages,
        count: messages.length
      }),
    };
  } catch (error) {
    console.error('Error getting thread history:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

/**
 * Trello API Functions
 */

// Create card in Trello board
async function trelloCreateCard(name, description, listId = null) {
  try {
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloApiToken = process.env.TRELLO_API_TOKEN;
    const trelloInboxListId = listId || process.env.TRELLO_INBOX_LIST_ID;
    
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
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        id: data.id,
        url: data.url,
        name: data.name
      }),
    };
  } catch (error) {
    console.error('Error creating Trello card:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

/**
 * System Prompt Management
 */

// Update system prompt for assistants
async function updateSystemPrompt(assistant, promptUpdate) {
  try {
    // Define path to system prompts based on the assistant name
    const promptsDir = path.join(process.cwd(), 'documentation', 'system-prompts');
    let promptFile;
    
    // Map assistant to file
    switch (assistant.toLowerCase()) {
      case 'hi':
      case 'handle-inbox':
        promptFile = path.join(promptsDir, 'hi.md');
        break;
      case 'dare':
      case 'daily-report':
        promptFile = path.join(promptsDir, 'dare.md');
        break;
      case 'chat':
        promptFile = path.join(promptsDir, 'chat.md');
        break;
      default:
        throw new Error(`Unknown assistant: ${assistant}`);
    }
    
    // Read the current prompt
    const currentPrompt = await fs.readFile(promptFile, 'utf8');
    
    // Apply the update
    const updatedPrompt = applyPromptUpdate(currentPrompt, promptUpdate);
    
    // Write back the updated prompt
    await fs.writeFile(promptFile, updatedPrompt, 'utf8');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        assistant,
        message: 'System prompt updated successfully'
      }),
    };
  } catch (error) {
    console.error('Error updating system prompt:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}

// Helper function to apply prompt updates
function applyPromptUpdate(currentPrompt, update) {
  // This is a simplified implementation - in a real system, you'd want more
  // sophisticated logic to apply updates while preserving structure
  if (update.mode === 'append') {
    // Append to the end of the prompt
    return `${currentPrompt}\n\n${update.content}`;
  } else if (update.mode === 'replace' && update.search) {
    // Replace a specific section
    return currentPrompt.replace(update.search, update.content);
  } else {
    // Complete replacement (be careful with this!)
    return update.content;
  }
}

exports.handler = async function (event, context) {
  // Parse input
  const parsedBody = JSON.parse(event.body)
  const { function_name, arguments: providedArguments } = parsedBody
  
  
  console.log(`Executing function ${function_name} with arguments ${providedArguments}`)
  
  // Parse function arguments if provided as string
  const parsedArguments = typeof providedArguments === 'string' ? JSON.parse(providedArguments) : providedArguments
  
  try {
    switch (function_name) {
      // Gmail API Tools
      case 'gmail_inbox_retrieval': {
        // Retrieve emails from inbox with filters
        const { labelFilter, maxResults, includeContent } = parsedArguments;
        return await gmailInboxRetrieval(labelFilter, maxResults, includeContent);
      }
      
      case 'gmail_label_email': {
        // Add/remove labels on emails
        const { messageId, addLabelIds, removeLabelIds } = parsedArguments;
        return await gmailLabelEmail(messageId, addLabelIds, removeLabelIds);
      }
      
      case 'gmail_archive_email': {
        // Archive emails (remove from inbox)
        const { messageId } = parsedArguments;
        return await gmailArchiveEmail(messageId);
      }
      
      case 'gmail_forward_email': {
        // Forward emails to another address
        const { messageId, to, subject, additionalContent } = parsedArguments;
        return await gmailForwardEmail(messageId, to, subject, additionalContent);
      }
      
      case 'gmail_create_draft': {
        // Create draft responses
        const { messageId, content } = parsedArguments;
        return await gmailCreateDraft(messageId, content);
      }
      
      case 'gmail_get_message': {
        // Get full message content (for categorization and processing)
        const { messageId } = parsedArguments;
        return await gmailGetMessage(messageId);
      }
      
      case 'gmail_get_attachment': {
        // Get attachment from email
        const { messageId, attachmentId } = parsedArguments;
        return await gmailGetAttachment(messageId, attachmentId);
      }
      
      case 'gmail_search_unsubscribe_link': {
        // Search for unsubscribe link in email
        const { messageId } = parsedArguments;
        return await gmailSearchUnsubscribeLink(messageId);
      }
      
      // Slack API Tools
      case 'slack_send_message': {
        // Send message to Slack channel
        const { channel, text, threadTs } = parsedArguments;
        // Use environment variable for channel if it exists, otherwise use the provided channel
        const targetChannel = process.env.SLACK_REPORT_CHANNEL_ID || channel;
        return await slackSendMessage(targetChannel, text, threadTs);
      }
      
      case 'slack_get_thread_history': {
        // Get thread history from Slack
        const { channel, threadTs } = parsedArguments;
        return await slackGetThreadHistory(channel, threadTs);
      }
      
      // Trello API Tools
      case 'trello_create_card': {
        // Create card in Trello board
        const { name, description, listId } = parsedArguments;
        return await trelloCreateCard(name, description, listId);
      }
      
      // System Prompt Management Tools
      case 'update_system_prompt': {
        // Update system prompt for assistants
        const { assistant, promptUpdate } = parsedArguments;
        return await updateSystemPrompt(assistant, promptUpdate);
      }
      
      // Special Tools
      case 'archive_old_emails': {
        // Archive emails labeled with archive-in-x-days that are older than x days
        const { days } = parsedArguments;
        return await archiveOldEmails(days);
      }
      
      default:
        console.error(`Unknown function: ${function_name}`)
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unknown function: ${function_name}` })
        }
    }
  } catch (error) {
    console.error(`Error executing function ${function_name}:`, error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An unknown error occurred' })
    }
  }
}