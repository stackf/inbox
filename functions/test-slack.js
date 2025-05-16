const fetch = require('node-fetch');

exports.handler = async function(event, context) {

    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    const text = `
    This is a test message from the serverless function.
    Hello world!`;
    
    try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        return {
            statusCode: 200,
            body: 'Slack message sent successfully'
        }
      } catch (error) {
        console.error('Error sending message to Slack:', error);
        return {
            statusCode: 500,
            body: `Error: ${error?.message}`,
        };
      }
};
  