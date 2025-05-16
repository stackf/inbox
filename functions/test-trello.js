
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloApiToken = process.env.TRELLO_API_TOKEN;
    const trelloInboxListId = process.env.TRELLO_INBOX_LIST_ID;

    const cardName = 'Test Card';
    const cardDesc = 'This is a test card created from the serverless function.';


    try {
        const response = await fetch(`https://api.trello.com/1/cards?idList=${trelloInboxListId}&name=${cardName}&desc=${cardDesc}&key=${trelloApiKey}&token=${trelloApiToken}`, {
            method: 'POST',
            headers: {
            'Accept': 'application/json'
            }
        })
        if(!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to create Trello card: ${response.status} - ${text}`);
        }
        return {
            statusCode: 200,
            body: 'Card created successfully'
        }


    } catch (err) {
        console.error('Error creating Trello card:', err);
        return {
            statusCode: 500,
            body: `Error: ${err?.message}`,
        };
    }
};
