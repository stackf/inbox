// Import required helpers
const { handler: toolCallHandler } = require('./tool-call');

/**
 * named test cases
 */
const testcases = {
  'add-archive-label': {
    functionName: 'gmail_label_email',
    arguments: {
      messageId: 'test-message-id',
      addLabelIds: [process.env.GMAIL_LABEL_ID_ARCHIVE_IN_3_DAYS],
      removeLabelIds: []
    }
  },
  'add-processed-by-hi-label': {
    functionName: 'gmail_label_email',
    arguments: {
      messageId: 'test-message-id',
      addLabelIds: [process.env.GMAIL_LABEL_ID_PROCESSED_BY_HI],
      removeLabelIds: []
    }
  },
  'add-to-summarize-label': {
    functionName: 'gmail_label_email',
    arguments: {
      messageId: 'test-message-id',
      addLabelIds: [process.env.GMAIL_LABEL_ID_TO_SUMMARIZE],
      removeLabelIds: []
    }
  },
  'create-draft': {
    functionName: 'gmail_create_draft',
    arguments: {
      messageId: 'test-message-id',
      content: 'Draft content'
    }
  },
  'forward-to-bookkeeping': {
    functionName: 'gmail_send_to_bookkeeper',
    arguments: {
      messageId: 'test-message-id'
    }
  },
}
exports.handler = async function (event, context) {
  // { labelFilter, maxResults, includeContent }

  // list emails to get a testcase
  // const listEmailsResponse = await toolCallHandler({
  //   httpMethod: 'POST',
  //   body: JSON.stringify({
  //     function_name: 'gmail_inbox_retrieval',
  //     arguments: { includeContent: true, maxResults: 30 }
  //   }),
  //   headers: {
  //     'x-netlify-trigger': 'test-trigger'
  //   }}, context)
  // const messages = JSON.parse(listEmailsResponse.body)?.messages.map(item=>({id:item.id, subject: item.headers['subject'], from: item.headers['from'], date: item.headers['date']}));
  // console.table(messages, [
  //   'id', 
  //   'subject', 
  //   // 'from', 
  //   // 'date'
  // ]);

  // call tool-call handler
  const testMessageId = '196ddb55860b14df';
  const testCase = testcases['forward-to-bookkeeping'];
  const inputEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      function_name: testCase.functionName,
      arguments: {
        ...testCase.arguments,
        messageId: testMessageId
      }
    }),
    headers: {
      'x-netlify-trigger': 'test-trigger'
    }
  };
  const toolCallResponse = await toolCallHandler(inputEvent, context);
  console.log('Tool call response:', JSON.parse(toolCallResponse.body));

  return {
    statusCode: 200
  }

}