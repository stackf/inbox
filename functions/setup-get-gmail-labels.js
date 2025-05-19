
const getGmailAccessToken = require('./helpers/gmail-get-access-token');
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const accessToken = await getGmailAccessToken();
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    const data = await response.json();
    return {
        statusCode: 200,
        body: JSON.stringify(data.labels),
      };
};
