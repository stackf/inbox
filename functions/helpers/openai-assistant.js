/**
 * OpenAI Assistant Helper
 * 
 * A utility class for working with OpenAI Assistants including thread management,
 * message handling, tool calling, and response processing.
 */

const OpenAI = require("openai");
const { getStore } = require('@netlify/blobs');
const { handler: toolCallHandler } = require('../tool-call');

class OpenAIAssistant {
  /**
   * Create a new OpenAIAssistant instance
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.assistantId - The OpenAI Assistant ID to use
   * @param {string} options.threadId - Optional existing thread ID to use
   * @param {string} options.responseFormat - Optional response format ('json' or 'text')
   * @param {Object} options.context - Optional context for tool execution
   */
  constructor({ assistantId, threadId = null, responseFormat = 'text', context = {} }) {
    if (!assistantId) {
      throw new Error('assistantId is required');
    }

    this.assistantId = assistantId;
    this.threadId = threadId;
    this.responseFormat = responseFormat;
    this.context = context;
    
    // Track tool calls to detect loops
    this.toolCallHistory = {};
    this.maxToolCallAttempts = 3; // Maximum attempts for the same tool+args combination
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Initialize blob store for thread persistence
    this.store = getStore({
      name: "assistant-threads",
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN
    });
  }

  /**
   * Create a new thread or load an existing one
   * 
   * @param {string} key - Optional key to store/retrieve the thread
   * @returns {Promise<string>} - The thread ID
   */
  async initializeThread(key = null) {
    // If we already have a thread ID, use it
    if (this.threadId) {
      return this.threadId;
    }
    
    // If a key is provided, try to load an existing thread
    if (key) {
      try {
        const threadData = await this.store.get(`thread-${key}`);
        if (threadData) {
          const parsed = JSON.parse(threadData);
          this.threadId = parsed.threadId;
          console.log(`Loaded existing thread: ${this.threadId} for key: ${key}`);
          return this.threadId;
        }
      } catch (error) {
        // Thread not found, will create a new one
        console.log(`No existing thread found for key: ${key}`);
      }
    }
    
    // Create a new thread
    const thread = await this.openai.beta.threads.create();
    this.threadId = thread.id;
    console.log(`Created new thread: ${this.threadId}`);
    
    // If a key is provided, store the thread
    if (key) {
      const threadData = {
        threadId: this.threadId,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      await this.store.set(`thread-${key}`, JSON.stringify(threadData));
      console.log(`Stored thread mapping for key: ${key}`);
    }
    
    return this.threadId;
  }

  /**
   * Add a message to the thread
   * 
   * @param {string} content - The message content
   * @param {string} role - The role (user or assistant)
   * @returns {Promise<Object>} - The created message
   */
  async addMessage(content, role = 'user') {
    if (!this.threadId) {
      await this.initializeThread();
    }
    
    const message = await this.openai.beta.threads.messages.create(
      this.threadId,
      { role, content }
    );
    
    console.log(`Added ${role} message to thread ${this.threadId}`);
    return message;
  }

  /**
   * Process tools that the assistant wants to call
   * 
   * @param {Object} run - The current run object
   * @returns {Promise<Object>} - The updated run
   */
  async handleToolCalls(run) {
    if (
      !run.required_action ||
      !run.required_action.submit_tool_outputs ||
      !run.required_action.submit_tool_outputs.tool_calls ||
      run.required_action.submit_tool_outputs.tool_calls.length === 0
    ) {
      return run;
    }
    
    const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
    console.log(`Processing ${toolCalls.length} tool calls`);
    
    const toolOutputs = [];
    let loopDetected = false;
    
    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') continue;
      
      const { name, arguments: args } = toolCall.function;
      console.log(`Executing tool: ${name}`);
      
      // Create a key for tracking this tool call
      const toolCallKey = `${name}:${args}`;
      
      // Check if we've seen this tool call too many times
      if (!this.toolCallHistory[toolCallKey]) {
        this.toolCallHistory[toolCallKey] = 0;
      }
      
      this.toolCallHistory[toolCallKey]++;
      
      if (this.toolCallHistory[toolCallKey] > this.maxToolCallAttempts) {
        console.warn(`Loop detected: Tool ${name} with args ${args} has been called ${this.toolCallHistory[toolCallKey]} times`);
        loopDetected = true;
        
        // Add a failure message for this tool call
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({ 
            error: `Maximum retry attempts (${this.maxToolCallAttempts}) exceeded for this operation. The operation has been canceled to prevent an infinite loop.`
          })
        });
        
        continue; // Skip executing this tool
      }
      
      try {
        // Call the function via the tool-call handler
        const result = await toolCallHandler({
          body: JSON.stringify({
            function_name: name,
            arguments: args
          })
        }, this.context);
        
        // Check if there was an error in the result
        const resultBody = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;
        if (resultBody.error) {
          console.log(`Error in tool call result: ${resultBody.error}`);
        }
        
        // Log email subject when getting a message or handling email operations
        if (name === 'gmail_get_message' && resultBody && resultBody.payload && resultBody.payload.headers) {
          const subjectHeader = resultBody.payload.headers.find(h => h.name === 'Subject');
          if (subjectHeader) {
            console.log(`Processing email with subject: "${subjectHeader.value}"`);
          }
        }
        
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: result.body
        });
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify({ error: error.message })
        });
      }
    }
    
    // If we detected a loop, add a message to the thread explaining the issue
    if (loopDetected) {
      await this.addMessage(
        "I've detected a loop in my processing. Some operations are being attempted repeatedly " +
        "without success. I'll stop trying these operations to prevent an infinite loop. " +
        "Please check if the required Gmail labels exist or if there are issues with the Slack channel configuration.",
        'assistant'
      );
      
      // Cancel the run
      try {
        await this.openai.beta.threads.runs.cancel(
          this.threadId,
          run.id
        );
        console.log(`Canceled run ${run.id} due to detected loop`);
        return { status: 'cancelled', error: 'Loop detected in tool calls' };
      } catch (error) {
        console.error(`Error canceling run: ${error.message}`);
      }
    }
    
    if (toolOutputs.length > 0) {
      console.log(`Submitting ${toolOutputs.length} tool outputs`);
      return await this.openai.beta.threads.runs.submitToolOutputs(
        this.threadId,
        run.id,
        { tool_outputs: toolOutputs }
      );
    }
    
    return run;
  }

  /**
   * Get the most recent assistant message
   * 
   * @returns {Promise<Object>} - The message content
   */
  async getLatestMessage() {
    const messages = await this.openai.beta.threads.messages.list(this.threadId);
    
    // Filter for assistant messages and get the most recent
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length === 0) {
      return null;
    }
    
    // Most recent message is first in the list
    const message = assistantMessages[0];
    
    // Process the content based on response format
    if (this.responseFormat === 'json') {
      return this.processJsonResponse(message);
    } else {
      return this.processTextResponse(message);
    }
  }
  
  /**
   * Process a message as JSON
   * 
   * @param {Object} message - The message to process
   * @returns {Object} - The processed content
   */
  processJsonResponse(message) {
    let jsonContent = null;
    let textContent = '';
    
    // Extract text content
    for (const contentPart of message.content) {
      if (contentPart.type === 'text') {
        textContent += contentPart.text.value;
      }
    }
    
    // Try to parse as JSON
    try {
      jsonContent = JSON.parse(textContent);
      return { 
        content: textContent,
        jsonContent, 
        id: message.id,
        created_at: message.created_at
      };
    } catch (error) {
      console.warn('Failed to parse response as JSON:', error.message);
      return { 
        content: textContent, 
        jsonContent: null,
        id: message.id,
        created_at: message.created_at,
        parseError: error.message
      };
    }
  }
  
  /**
   * Process a message as text
   * 
   * @param {Object} message - The message to process
   * @returns {Object} - The processed content
   */
  processTextResponse(message) {
    let textContent = '';
    
    // Extract text content
    for (const contentPart of message.content) {
      if (contentPart.type === 'text') {
        textContent += contentPart.text.value;
      }
    }
    
    return { 
      content: textContent,
      id: message.id,
      created_at: message.created_at
    };
  }

  /**
   * Run the assistant and process the response
   * 
   * @returns {Promise<Object>} - The result of the run
   */
  async run() {
    if (!this.threadId) {
      await this.initializeThread();
    }
    
    console.log(`Running assistant ${this.assistantId} on thread ${this.threadId}`);
    
    // Start a run
    let run = await this.openai.beta.threads.runs.create(
      this.threadId,
      { assistant_id: this.assistantId }
    );
    
    // Poll until the run completes or fails
    while (run.status === 'queued' || run.status === 'in_progress') {
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await this.openai.beta.threads.runs.retrieve(this.threadId, run.id);
      
      // Handle tool calls
      if (run.status === 'requires_action') {
        run = await this.handleToolCalls(run);
      }
    }
    
    // Process the final result
    if (run.status === 'completed') {
      const message = await this.getLatestMessage();
      return {
        status: 'completed',
        ...message
      };
    } else if (run.status === 'cancelled' || run.status === 'cancelled') {
      console.log(`Run was cancelled, likely due to loop detection`);
      const message = await this.getLatestMessage();
      return {
        status: 'cancelled',
        message: 'Run was cancelled due to repetitive failed operations',
        ...(message ? message : {})
      };
    } else {
      console.error(`Run failed with status: ${run.status}`);
      return {
        status: run.status,
        error: run.last_error?.message || 'Unknown error'
      };
    }
  }
}

module.exports = OpenAIAssistant;