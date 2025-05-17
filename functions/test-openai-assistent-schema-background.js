const OpenAI = require("openai")
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const { handler: toolCall } = require('./tool-call')

// working example of schema returning assistent
exports.handler = async function(event, context) {
    const message = "hello world"
    let openaiThreadId = null
    let thread
    
    if (!openaiThreadId) {
      // Create a new OpenAI thread
      thread = await openai.beta.threads.create()
      openaiThreadId = thread.id
      console.log('Created new OpenAI thread:', openaiThreadId)
    } else {
      console.log('Using existing OpenAI thread:', openaiThreadId)
    }
    
    // Add the user's message to the OpenAI thread
    await openai.beta.threads.messages.create(openaiThreadId, {
      role: 'user',
      content: message
    })
    
    // Define handlers for processing the assistant's response
    const handleRequiresAction = async (run) => {
      console.log('handleRequiresAction:', run?.id)
      
      // Check if there are tools that require outputs
      if (
        run.required_action &&
        run.required_action.submit_tool_outputs &&
        run.required_action.submit_tool_outputs.tool_calls
      ) {
        // Loop through each tool in the required action section
        const toolCalls = run.required_action?.submit_tool_outputs?.tool_calls
        console.log('tool_calls:', toolCalls)
        const functionToolCalls = toolCalls.filter(toolCall => toolCall.type === 'function')
        
        // For each tool call, call the function
        const toolOutputs = []
        for (const item of functionToolCalls) {
          const function_name = item.function.name
          const function_arguments = item.function.arguments
          
          console.log(`function ${function_name}(${function_arguments})`)

          // Call the function with the arguments
          const output = await toolCall({
            body: JSON.stringify({
              function_name,
              arguments: function_arguments
            })
          }, context)
          
          console.log('function output:', output)
          toolOutputs.push({
            tool_call_id: item.id,
            output: output.body
          })
        }
        
        if (toolOutputs.length > 0) {
          run = await openai.beta.threads.runs.submitToolOutputsAndPoll(
            openaiThreadId,
            run.id,
            { tool_outputs: toolOutputs },
          )
          console.log("Tool outputs submitted successfully.")
        } else {
          console.log("No tool outputs to submit.")
        }
        
        // Check status after submitting tool outputs
        return handleRunStatus(run)
      }
    }
    
    const handleRunStatus = async (run) => {
      console.log('handleRunStatus:', run?.status)
      
      // Check the run status
      if (run.status === "completed") {
        // Get the assistant's messages
        let messagesResponse = await openai.beta.threads.messages.list(openaiThreadId)
        
        // Find the most recent assistant message (should be the last one)
        const assistantMessages = messagesResponse.data.filter(msg => msg.role === 'assistant')
        if (assistantMessages.length > 0) {
          const latestMessage = assistantMessages[0] // Messages are sorted with newest first
          
          // Extract the content (handling different content types)
          let content = ''
          if (latestMessage.content && latestMessage.content.length > 0) {
            for (const contentPart of latestMessage.content) {
              if (contentPart.type === 'text') {
                content += contentPart.text.value
              }
            }
          }
          
          console.log('Do something with the assistant message:', content)
        }
        // do not return status-code in background function
        return;
        // return { 
        //   statusCode: 200, 
        //   body: JSON.stringify({ success: true }) 
        // }
      } else if (run.status === "requires_action") {
        console.log('Run requires action')
        return await handleRequiresAction(run)
      } else if (["failed", "expired", "cancelled"].includes(run.status)) {
        console.error(`Run ${run.status}:`, run)
        // Handle the error case (e.g. slack message)

        // do not return status-code in background function
        return;
        // return { 
        //   statusCode: 500, 
        //   body: JSON.stringify({ error: `Run ${run.status}` }) 
        // }
      } else {
        console.log(`Run is ${run.status}, waiting for completion...`)
        // For in_progress or queued status, we should poll
        // In a real implementation, you'd want to use a background task for this
        return;
        // return { 
        //   statusCode: 202, 
        //   body: JSON.stringify({ status: run.status }) 
        // }
      }
    }
    
    // Run the assistant
    console.log('Starting assistant run on thread:', openaiThreadId)
    const run = await openai.beta.threads.runs.createAndPoll(
      openaiThreadId,
      { assistant_id: process.env.HI_OPENAI_ASSISTENT_ID }
    )
    
    return handleRunStatus(run)
    
};