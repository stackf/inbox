const { getStore } = require('@netlify/blobs');

/**
 * Simple function to test Netlify Blob Storage
 * This function can be used to verify that blob storage is working correctly
 */
exports.handler = async function(event, context) {
  try {
    // Get the HTTP method to determine action
    const httpMethod = event.httpMethod;
    
    // Initialize Netlify Blobs store
    const store = getStore({
      name: "test-store",
      siteID: process.env.SITE_ID,
      token: process.env.NETLIFY_BLOBS_TOKEN || context.clientContext?.identity?.token
    });
    
    if (httpMethod === 'GET') {
      // Check if there's a key parameter
      const params = event.queryStringParameters || {};
      const key = params.key;
      
      if (key) {
        // Get a specific blob
        try {
          const value = await store.get(key);
          return {
            statusCode: 200,
            body: typeof value === 'string' ? value : JSON.stringify(value)
          };
        } catch (error) {
          return {
            statusCode: 404,
            body: JSON.stringify({ message: `Blob with key '${key}' not found` })
          };
        }
      } else {
        // List all blobs
        const blobs = await store.list();
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "List of blobs in test-store",
            blobs: blobs
          })
        };
      }
    } 
    else if (httpMethod === 'POST') {
      // Store a test blob
      const body = JSON.parse(event.body || '{}');
      const key = body.key || `test-${Date.now()}`;
      const value = body.value || { 
        message: "Test data", 
        timestamp: new Date().toISOString() 
      };
      
      await store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Successfully stored blob",
          key: key
        })
      };
    }
    
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        message: "Invalid request method. Use GET to retrieve blobs or POST to store a blob.",
        usage: {
          "GET /test-netlify-blob": "List all blobs",
          "GET /test-netlify-blob?key=<key>": "Get a specific blob",
          "POST /test-netlify-blob": "Store a blob (body: {key: string, value: any})"
        }
      })
    };
    
  } catch (error) {
    console.error('Error in test-netlify-blob function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message })
    };
  }
};