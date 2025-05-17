const fetch = require('node-fetch');
const { getStore } = require('@netlify/blobs');

/**
 * Thread Mapping Service:
 * 1. Maps OpenAI Assistant thread IDs to Slack thread IDs
 * 2. Runs on a schedule to clean up old mappings
 * 3. Provides API for storing and retrieving thread mappings
 * 
 * To set up the cron job, add this to netlify.toml:
 * [functions.netlify-cron-blob-example]
 *   schedule = "0 * * * *"  # Run once per hour
 */

// test setting a thread
// netlify functions:invoke netlify-cron-blob-example --payload '{"openAiThreadId":"thread_12345","slackThreadId":"thread_67890","userId":"U1234567","channelId":"C1234567"}'
exports.handler = async function(event, context) {
  try {
    // Check if this is a scheduled event (cron job)
    const isScheduled = event.headers['x-netlify-event'] === 'schedule';
    
    // Get the HTTP method to determine action
    const httpMethod = event.httpMethod;
    
    // Log execution context
    console.log(`Function executed with method: ${httpMethod}, scheduled: ${isScheduled}`);
    
    // Initialize Netlify Blobs store for thread mappings
    console.log('Initializing thread mapping store with SITE_ID:', process.env.SITE_ID);
    const store = getStore({
      name: "thread-mappings",
      siteID: process.env.SITE_ID, // This env var is automatically set by Netlify
      token: process.env.NETLIFY_BLOBS_TOKEN // This should be set in your Netlify environment variables
    });
    
    // Handle different request types
    if (httpMethod === 'GET') {
      // Check if we're looking for a specific thread mapping
      const params = event.queryStringParameters || {};
      
      if (params.openAiThreadId) {
        // Look up a specific mapping by OpenAI Thread ID
        try {
          const mapping = await store.get(`openai-${params.openAiThreadId}`);
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: "Mapping found",
              openAiThreadId: params.openAiThreadId,
              slackThreadId: mapping ? JSON.parse(mapping).slackThreadId : null,
              mappingData: mapping ? JSON.parse(mapping) : null
            })
          };
        } catch (error) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: "Mapping not found",
              openAiThreadId: params.openAiThreadId
            })
          };
        }
      } else if (params.slackThreadId) {
        // Look up a specific mapping by Slack Thread ID
        try {
          const mapping = await store.get(`slack-${params.slackThreadId}`);
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: "Mapping found",
              slackThreadId: params.slackThreadId,
              openAiThreadId: mapping ? JSON.parse(mapping).openAiThreadId : null,
              mappingData: mapping ? JSON.parse(mapping) : null
            })
          };
        } catch (error) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: "Mapping not found",
              slackThreadId: params.slackThreadId
            })
          };
        }
      } else {
        // List all thread mappings
        const listResult = await store.list();
        
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Thread mappings list",
            mappings: listResult,
            isScheduled: isScheduled
          })
        };
      }
    } 
    else if (httpMethod === 'POST') {
      console.log('handle POST', event.body);
      
      // For this example, we'll use hardcoded values instead of trying to parse the body
      // This simplifies testing and demonstrates the core functionality
      
      // Hardcoded example thread mapping
      const openAiThreadId = "thread_example123";
      const slackThreadId = "1624553390.123456";
      const userId = "U0123456";
      const channelId = "C0123456";
      
      console.log('Creating hardcoded thread mapping example');
      
      // Create the mapping data
      const timestamp = new Date().toISOString();
      const mappingData = {
        openAiThreadId,
        slackThreadId,
        userId: userId || 'anonymous',
        channelId: channelId || 'unknown',
        createdAt: timestamp,
        lastUpdated: timestamp
      };
      
      // Store the mapping with two keys for bidirectional lookup
      // Key 1: OpenAI Thread ID -> Slack Thread ID
      try {
        await store.set(`openai-${openAiThreadId}`, JSON.stringify(mappingData));
      } catch (err) {
        console.error('Error storing OpenAI mapping:', err);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Failed to store OpenAI mapping" })
        };
      }
      
      
      // Key 2: Slack Thread ID -> OpenAI Thread ID
      await store.set(`slack-${slackThreadId}`, JSON.stringify(mappingData));
      
      console.log('Thread mapping created:', openAiThreadId, '<->', slackThreadId);
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Successfully created thread mapping",
          mapping: mappingData
        })
      };
    }
    else if (httpMethod === 'DELETE') {
      // Delete a thread mapping
      const requestBody = JSON.parse(event.body || '{}');
      const { openAiThreadId, slackThreadId } = requestBody;
      
      if (!openAiThreadId && !slackThreadId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            message: "Either openAiThreadId or slackThreadId is required" 
          })
        };
      }
      
      if (openAiThreadId) {
        // Get the mapping to find the associated slackThreadId
        try {
          const mapping = await store.get(`openai-${openAiThreadId}`);
          const parsedMapping = JSON.parse(mapping);
          
          // Delete both sides of the mapping
          await store.delete(`openai-${openAiThreadId}`);
          
          if (parsedMapping && parsedMapping.slackThreadId) {
            await store.delete(`slack-${parsedMapping.slackThreadId}`);
          }
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: `Successfully deleted mapping for OpenAI Thread: ${openAiThreadId}`,
              deletedMapping: parsedMapping
            })
          };
        } catch (error) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: `Mapping not found for OpenAI Thread: ${openAiThreadId}`
            })
          };
        }
      } else {
        // Get the mapping to find the associated openAiThreadId
        try {
          const mapping = await store.get(`slack-${slackThreadId}`);
          const parsedMapping = JSON.parse(mapping);
          
          // Delete both sides of the mapping
          await store.delete(`slack-${slackThreadId}`);
          
          if (parsedMapping && parsedMapping.openAiThreadId) {
            await store.delete(`openai-${parsedMapping.openAiThreadId}`);
          }
          
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: `Successfully deleted mapping for Slack Thread: ${slackThreadId}`,
              deletedMapping: parsedMapping
            })
          };
        } catch (error) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: `Mapping not found for Slack Thread: ${slackThreadId}`
            })
          };
        }
      }
    }
    else if (isScheduled) {
      // This is a scheduled event (cron job)
      // Perform maintenance on thread mappings
      console.log('Running scheduled maintenance on thread mappings');
      
      // List all mappings
      const mappings = await store.list();
      console.log(`Found ${mappings.length} mappings`);
      
      // Get current time for age calculations
      const now = new Date();
      
      // Sample metrics for the report
      const metrics = {
        totalMappings: mappings.length,
        oldMappings: 0,
        cleanedMappings: 0,
        retainedMappings: 0,
        errors: 0
      };
      
      // Generate some sample data for demo purposes
      if (mappings.length < 3) {
        console.log('Creating sample thread mappings for demo purposes');
        
        // Create sample mappings
        const sampleData = [
          {
            openAiThreadId: `thread_${Math.random().toString(36).substring(2, 10)}`,
            slackThreadId: `${Date.now().toString().substring(0, 10)}.${Math.floor(Math.random() * 1000000)}`,
            userId: 'U0123456',
            channelId: 'C0123456',
            createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
            lastUpdated: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
          },
          {
            openAiThreadId: `thread_${Math.random().toString(36).substring(2, 10)}`,
            slackThreadId: `${Date.now().toString().substring(0, 10)}.${Math.floor(Math.random() * 1000000)}`,
            userId: 'U7890123',
            channelId: 'C7890123',
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            lastUpdated: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            openAiThreadId: `thread_${Math.random().toString(36).substring(2, 10)}`,
            slackThreadId: `${Date.now().toString().substring(0, 10)}.${Math.floor(Math.random() * 1000000)}`,
            userId: 'U4567890',
            channelId: 'C4567890',
            createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
            lastUpdated: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        for (const sample of sampleData) {
          await store.set(`openai-${sample.openAiThreadId}`, JSON.stringify(sample));
          await store.set(`slack-${sample.slackThreadId}`, JSON.stringify(sample));
        }
        
        console.log('Created sample mappings');
        metrics.samplesCreated = sampleData.length;
      }
      
      // Process each mapping
      for (const key of mappings) {
        // Only process OpenAI keys to avoid duplication
        if (!key.startsWith('openai-')) continue;
        
        try {
          // Get the mapping data
          const mappingStr = await store.get(key);
          const mapping = JSON.parse(mappingStr);
          
          // Check if the mapping is older than 24 hours
          const lastUpdated = new Date(mapping.lastUpdated);
          const ageInHours = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
          
          if (ageInHours > 24) {
            metrics.oldMappings++;
            
            // For demo purposes, only delete mappings older than 30 hours
            if (ageInHours > 30) {
              // Delete both sides of the mapping
              await store.delete(`openai-${mapping.openAiThreadId}`);
              await store.delete(`slack-${mapping.slackThreadId}`);
              
              console.log(`Deleted old mapping: ${mapping.openAiThreadId} <-> ${mapping.slackThreadId} (${ageInHours.toFixed(1)} hours old)`);
              metrics.cleanedMappings++;
            } else {
              metrics.retainedMappings++;
            }
          } else {
            // This is a recent mapping, keep it
            metrics.retainedMappings++;
          }
        } catch (error) {
          console.error(`Error processing mapping ${key}:`, error);
          metrics.errors++;
        }
      }
      
      // Run the maintenance job again to get updated mapping count
      const updatedMappings = await store.list();
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Successfully executed thread mapping maintenance job",
          timestamp: now.toISOString(),
          metrics,
          currentMappingCount: updatedMappings.length
        })
      };
    }
    
    // Default response
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid request method" })
    };
  } catch (error) {
    console.error('Error in netlify-cron-blob-example function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error.message })
    };
  }
};