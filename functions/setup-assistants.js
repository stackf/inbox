// Setup OpenAI Assistants
// This function creates or updates the OpenAI assistants with their system prompts and tools

const OpenAI = require("openai");
const fs = require('fs').promises;
const path = require('path');

// Initialize OpenAI SDK
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Define the assistant configurations
const assistants = [
  {
    name: "Handle-Inbox",
    model: "gpt-4o-mini",
    promptFile: "hi.md",
    envVar: "HI_OPENAI_ASSISTANT_ID",
    tools: [
      { type: "function", function: { name: "gmail_inbox_retrieval" } },
      { type: "function", function: { name: "gmail_label_email" } },
      { type: "function", function: { name: "gmail_archive_email" } },
      { type: "function", function: { name: "gmail_send_to_bookkeeper" } },
      { type: "function", function: { name: "gmail_create_draft" } },
      { type: "function", function: { name: "gmail_get_message" } },
      { type: "function", function: { name: "gmail_get_attachment" } },
      { type: "function", function: { name: "gmail_search_unsubscribe_link" } },
      { type: "function", function: { name: "slack_send_message" } },
      { type: "function", function: { name: "trello_create_card" } },
      { type: "function", function: { name: "archive_old_emails" } }
    ]
  },
  {
    name: "Daily-Report",
    model: "gpt-4o",
    promptFile: "dare.md",
    envVar: "DARE_OPENAI_ASSISTANT_ID",
    tools: [
      { type: "function", function: { name: "gmail_inbox_retrieval" } },
      { type: "function", function: { name: "gmail_get_message" } },
      { type: "function", function: { name: "gmail_search_unsubscribe_link" } },
      { type: "function", function: { name: "slack_send_message" } }
    ]
  },
  {
    name: "Chat",
    model: "gpt-4o",
    promptFile: "chat.md",
    envVar: "CHAT_OPENAI_ASSISTANT_ID",
    tools: [
      { type: "function", function: { name: "gmail_inbox_retrieval" } },
      { type: "function", function: { name: "gmail_label_email" } },
      { type: "function", function: { name: "gmail_archive_email" } },
      { type: "function", function: { name: "gmail_send_to_bookkeeper" } },
      { type: "function", function: { name: "gmail_create_draft" } },
      { type: "function", function: { name: "gmail_get_message" } },
      { type: "function", function: { name: "gmail_get_attachment" } },
      { type: "function", function: { name: "gmail_search_unsubscribe_link" } },
      { type: "function", function: { name: "slack_send_message" } },
      { type: "function", function: { name: "slack_get_thread_history" } },
      { type: "function", function: { name: "trello_create_card" } },
      { type: "function", function: { name: "update_system_prompt" } }
    ]
  }
];

// Define detailed schemas for tool definitions
const getToolDefinitionWithSchema = (name) => {
  // Base schema object
  const schema = {
    type: "object",
    properties: {},
    required: []
  };
  
  let description = "";
  
  // Define detailed schemas for each tool
  switch (name) {
    // Gmail API Tools
    case "gmail_inbox_retrieval":
      description = "Retrieves emails from Gmail inbox with specified filters";
      schema.properties = {
        labelFilter: {
          type: "array",
          items: { type: "string" },
          description: "Array of labels to filter by. Prefix with '!' to exclude labels. Example: ['INBOX', '!processed-by-hi']. The system will automatically convert label names to their IDs."
        },
        maxResults: {
          type: "integer",
          description: "Maximum number of emails to retrieve (1-100).",
          minimum: 1,
          maximum: 100,
          default: 10
        },
        includeContent: {
          type: "boolean",
          description: "Whether to include full message content or just metadata.",
          default: false
        }
      };
      break;
      
    case "gmail_label_email":
      description = "Adds or removes labels from a Gmail message";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email to modify."
        },
        addLabelIds: {
          type: "array",
          items: { type: "string" },
          description: "Labels to add to the email. Only use our custom labels: 'processed-by-hi', 'to-summarize', 'archive-in-3-days'. Do NOT use Gmail system labels like 'INBOX', 'UNREAD', etc. directly.",
          default: []
        },
        removeLabelIds: {
          type: "array",
          items: { type: "string" },
          description: "Labels to remove from the email. Only use 'INBOX' to archive emails. Do not remove our custom labels directly.",
          default: []
        }
      };
      schema.required = ["messageId"];
      break;
      
    case "gmail_archive_email":
      description = "Archives an email by removing it from the inbox";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email to archive."
        }
      };
      schema.required = ["messageId"];
      break;
      
    case "gmail_forward_email":
      description = "DEPRECATED: Use gmail_send_to_bookkeeper instead. Forwards an email to the bookkeeping email address defined in BOOKKEEPING_EMAIL environment variable";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email to forward."
        },
        subject: {
          type: "string",
          description: "Optional custom subject line. If not provided, will use 'Fwd: [Original Subject]'."
        },
        additionalContent: {
          type: "string",
          description: "Optional text to add at the beginning of the forwarded email."
        }
      };
      schema.required = ["messageId"];
      break;
      
    case "gmail_create_draft":
      description = "Creates a draft reply to an email";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email to reply to."
        },
        content: {
          type: "string",
          description: "The content of the draft reply."
        }
      };
      schema.required = ["messageId", "content"];
      break;
      
    case "gmail_get_message":
      description = "Gets the full content and metadata of an email";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email to retrieve."
        }
      };
      schema.required = ["messageId"];
      break;
      
    case "gmail_get_attachment":
      description = "Gets an attachment from an email";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email containing the attachment."
        },
        attachmentId: {
          type: "string",
          description: "The ID of the attachment to retrieve."
        }
      };
      schema.required = ["messageId", "attachmentId"];
      break;
      
    case "gmail_search_unsubscribe_link":
      description = "DEPRECATED: Extract unsubscribe links directly from message content. Searches an email for an unsubscribe link";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email to search for an unsubscribe link."
        }
      };
      schema.required = ["messageId"];
      break;
      
    case "gmail_send_to_bookkeeper":
      description = "Sends an email with its attachments to the bookkeeping email address defined in BOOKKEEPING_EMAIL environment variable. Adds GMAIL_LABEL_ID_SENT_TO_BOOKKEEPING label when sent.";
      schema.properties = {
        messageId: {
          type: "string",
          description: "The ID of the email to send to bookkeeping."
        }
      };
      schema.required = ["messageId"];
      break;
      
    // Slack API Tools
    case "slack_send_message":
      description = "Sends a message to a Slack channel or thread";
      schema.properties = {
        channel: {
          type: "string",
          description: "The channel ID to send the message to."
        },
        text: {
          type: "string",
          description: "The text content of the message to send."
        },
        threadTs: {
          type: "string",
          description: "Optional thread timestamp to reply in a thread."
        }
      };
      schema.required = ["channel", "text"];
      break;
      
    case "slack_get_thread_history":
      description = "Retrieves message history from a Slack thread";
      schema.properties = {
        channel: {
          type: "string",
          description: "The channel ID containing the thread."
        },
        threadTs: {
          type: "string",
          description: "The timestamp of the thread to get history from."
        }
      };
      schema.required = ["channel", "threadTs"];
      break;
      
    // Trello API Tools
    case "trello_create_card":
      description = "Creates a card in the Trello Getting Things Done board";
      schema.properties = {
        name: {
          type: "string",
          description: "The title of the card."
        },
        description: {
          type: "string",
          description: "The description of the card. Can include detailed action items or notes."
        },
        listId: {
          type: "string",
          description: "Optional ID of the list to add the card to. If not provided, will use the inbox list."
        }
      };
      schema.required = ["name", "description"];
      break;
      
    // System Prompt Management Tools
    case "update_system_prompt":
      description = "Updates the system prompt for one of the assistants";
      schema.properties = {
        assistant: {
          type: "string",
          description: "The assistant to update. Must be one of: 'hi', 'handle-inbox', 'dare', 'daily-report', 'chat'.",
          enum: ["hi", "handle-inbox", "dare", "daily-report", "chat"]
        },
        promptUpdate: {
          type: "object",
          description: "The update details.",
          properties: {
            mode: {
              type: "string",
              description: "How to apply the update: 'append' (add to end), 'replace' (replace specific section), or 'full' (replace entire prompt).",
              enum: ["append", "replace", "full"]
            },
            search: {
              type: "string",
              description: "The text to search for and replace. Required when mode is 'replace'."
            },
            content: {
              type: "string",
              description: "The new content to add or replace with."
            }
          },
          required: ["mode", "content"]
        }
      };
      schema.required = ["assistant", "promptUpdate"];
      break;
      
    // Special Tools
    case "archive_old_emails":
      description = "Archives emails labeled with archive-in-x-days that are older than x days";
      schema.properties = {
        days: {
          type: "integer",
          description: "Number of days. Will archive emails labeled 'archive-in-X-days' that are older than X days.",
          minimum: 1,
          default: 3
        }
      };
      break;
      
    // Default schema (fallback)
    default:
      description = `Call the ${name} function`;
      break;
  }
  
  return {
    type: "function",
    function: {
      name: name,
      description: description,
      parameters: schema
    }
  };
};

exports.handler = async function(event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method Not Allowed'
      };
    }
    
    // Tool definition function URL
    const toolFunctionUrl = `${process.env.BASE_URL}/.netlify/functions/tool-call`;
    
    // Read all system prompts
    const promptsDir = path.join(process.cwd(), 'documentation', 'system-prompts');
    const promptContents = {};
    
    for (const assistant of assistants) {
      const promptPath = path.join(promptsDir, assistant.promptFile);
      promptContents[assistant.promptFile] = await fs.readFile(promptPath, 'utf8');
    }
    
    // Setup each assistant
    const results = [];
    
    for (const assistant of assistants) {
      // Check if assistant already exists
      const existingId = process.env[assistant.envVar];
      let data;
      
      // Prepare the assistant configuration
      const assistantConfig = {
        name: assistant.name,
        instructions: promptContents[assistant.promptFile],
        model: assistant.model,
        tools: assistant.tools.map(tool => {
          if (tool.type === "function") {
            return getToolDefinitionWithSchema(tool.function.name);
          }
          return tool;
        })
      };
      
      try {
        if (existingId) {
          // Update existing assistant
          console.log(`Updating assistant ${assistant.name} (${existingId})`);
          data = await openai.beta.assistants.update(existingId, assistantConfig);
        } else {
          // Create new assistant
          console.log(`Creating assistant ${assistant.name}`);
          data = await openai.beta.assistants.create(assistantConfig);
        }
        
        results.push({
          name: assistant.name,
          id: data.id,
          action: existingId ? 'updated' : 'created'
        });
        
        console.log(`Assistant ${assistant.name} ${existingId ? 'updated' : 'created'} with ID ${data.id}`);
      } catch (assistantError) {
        console.error(`Error with assistant ${assistant.name}:`, assistantError);
        throw new Error(`Failed to ${existingId ? 'update' : 'create'} assistant ${assistant.name}: ${assistantError.message}`);
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Assistants setup completed successfully',
        assistants: results
      })
    };
  } catch (error) {
    console.error('Error setting up assistants:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};