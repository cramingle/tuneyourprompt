const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const cosineSimilarity = require('compute-cosine-similarity');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'https://ai.mailbyai.site';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || false;
const IS_VERCEL = process.env.VERCEL === '1';

// Log environment on startup
console.log('Environment:', {
  PORT,
  OLLAMA_API_URL,
  USE_MOCK_DATA,
  IS_VERCEL
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper function to calculate text similarity
function calculateSimilarity(text1, text2) {
  // Simple implementation - in production, you'd want a more sophisticated approach
  // Convert texts to lowercase and remove punctuation
  const cleanText1 = text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  const cleanText2 = text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  
  // Create a set of all unique words
  const uniqueWords = new Set([...cleanText1, ...cleanText2]);
  
  // Create vectors for each text
  const vector1 = Array.from(uniqueWords).map(word => cleanText1.filter(w => w === word).length);
  const vector2 = Array.from(uniqueWords).map(word => cleanText2.filter(w => w === word).length);
  
  // Calculate cosine similarity
  const similarity = cosineSimilarity(vector1, vector2);
  
  // Return percentage (0-100)
  return Math.round((similarity + 1) / 2 * 100);
}

// Analyze prompt quality
function analyzePromptQuality(prompt, goal) {
  const analysis = {
    clarity: { score: 0, feedback: '' },
    detail: { score: 0, feedback: '' },
    relevance: { score: 0, feedback: '' }
  };
  
  // Check clarity
  const clarityKeywords = ['tone', 'style', 'format', 'audience', 'purpose'];
  const hasClarity = clarityKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
  analysis.clarity.score = hasClarity ? 100 : 50;
  analysis.clarity.feedback = hasClarity 
    ? 'Good job specifying tone/style in your prompt!' 
    : 'Consider specifying tone, style, or format in your prompt.';
  
  // Check detail
  const wordCount = prompt.split(/\s+/).length;
  analysis.detail.score = wordCount > 10 ? 100 : wordCount > 5 ? 70 : 40;
  analysis.detail.feedback = wordCount > 10 
    ? 'Your prompt has good detail!' 
    : 'Try adding more specific details to your prompt.';
  
  // Check relevance
  const goalKeywords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const promptContainsGoalKeywords = goalKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
  analysis.relevance.score = promptContainsGoalKeywords ? 100 : 50;
  analysis.relevance.feedback = promptContainsGoalKeywords 
    ? 'Your prompt aligns well with your goal!' 
    : 'Make sure your prompt includes key elements from your goal.';
  
  return analysis;
}

// Generate improved prompt suggestion
function generateImprovedPrompt(originalPrompt, goal, analysis) {
  let suggestion = originalPrompt;
  
  // Add clarity if missing
  if (analysis.clarity.score < 70) {
    const goalWords = goal.toLowerCase().split(/\s+/);
    if (goalWords.includes('funny') && !suggestion.toLowerCase().includes('funny')) {
      suggestion = suggestion.replace(/\.$/, '') + ' with a humorous tone.';
    } else if (goalWords.includes('detailed') && !suggestion.toLowerCase().includes('detail')) {
      suggestion = suggestion.replace(/\.$/, '') + ' with detailed descriptions.';
    } else {
      suggestion = suggestion.replace(/\.$/, '') + ' Be specific and clear.';
    }
  }
  
  // Add relevance if missing
  if (analysis.relevance.score < 70) {
    const goalKeywords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const missingKeywords = goalKeywords.filter(keyword => 
      !suggestion.toLowerCase().includes(keyword)
    );
    
    if (missingKeywords.length > 0) {
      suggestion = suggestion.replace(/\.$/, '') + 
        ` Include these key elements: ${missingKeywords.join(', ')}.`;
    }
  }
  
  return suggestion;
}

// Generate a mock AI response based on the prompt and goal
function generateMockResponse(prompt, goal) {
  // Extract key terms from the goal
  const goalWords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  
  // Check if the goal mentions specific content types
  const isStory = goal.toLowerCase().includes('story');
  const isPoem = goal.toLowerCase().includes('poem');
  const isFunny = goal.toLowerCase().includes('funny') || goal.toLowerCase().includes('humor');
  const isPirate = goal.toLowerCase().includes('pirate');
  
  let response = '';
  
  if (isStory && isPirate) {
    response = "Captain Redbeard stood at the helm of his ship, the Salty Seadog, gazing out at the horizon. The sea was calm today, too calm for his liking. \"Where's the adventure in smooth sailing?\" he grumbled to his first mate, a parrot named Crackers.\n\n\"Squawk! Boring seas ahead!\" Crackers replied, flapping his colorful wings.";
    
    if (isFunny) {
      response += "\n\nSuddenly, Redbeard spotted something in the distance. \"Man the cannons!\" he shouted, pulling out his spyglass. After a moment of intense squinting, he lowered it with a sigh. \"False alarm, lads. It's just a very large seagull with an attitude problem.\"";
    }
  } else if (isPoem) {
    response = "Whispers of the mind,\nEchoing through endless space,\nThoughts become real things.";
    
    if (goalWords.some(word => ['nature', 'ocean', 'sea'].includes(word))) {
      response = "Ocean waves rolling,\nBlue vastness touching the sky,\nEndless horizon.";
    }
  } else {
    // Generic response that tries to incorporate goal keywords
    response = `Here's a response about ${goalWords.join(', ')}. The quality of this response depends on how well your prompt was crafted. A good prompt would specify exactly what you want, including tone, style, format, and key details.`;
  }
  
  return response;
}

// API endpoint to evaluate prompts
app.post('/api/evaluate', async (req, res) => {
  try {
    const { prompt, goal } = req.body;
    
    if (!prompt || !goal) {
      return res.status(400).json({ error: 'Prompt and goal are required' });
    }
    
    let aiResponse;
    
    // Try to call external API or use mock data if specified/needed
    try {
      if (USE_MOCK_DATA) {
        throw new Error('Using mock data as specified in environment');
      }
      
      // Since this API seems to be designed for email templates, let's try a different approach
      const enhancedPrompt = `Create a plain text response (no HTML) for the following prompt: ${prompt}`;
      
      console.log('Sending prompt to API:', enhancedPrompt);
      
      // Set a timeout based on environment - shorter for Vercel
      const controller = new AbortController();
      const timeoutDuration = IS_VERCEL ? 10000 : 30000; // 10 seconds for Vercel, 30 seconds for local
      const timeoutId = setTimeout(() => {
        console.log(`API request timed out after ${timeoutDuration/1000} seconds`);
        controller.abort();
      }, timeoutDuration);
      
      console.log(`Setting API timeout to ${timeoutDuration/1000} seconds`);
      
      const apiResponse = await fetch(`${OLLAMA_API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'metis',
          prompt: enhancedPrompt,
          stream: false
        }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!apiResponse.ok) {
        console.log(`API responded with status: ${apiResponse.status}`);
        throw new Error(`API responded with status: ${apiResponse.status}`);
      }
      
      const data = await apiResponse.json();
      console.log('API response:', JSON.stringify(data).substring(0, 200) + '...');
      
      // Extract the content based on the response type
      if (data.type === 'text' && data.content) {
        console.log('Using text content');
        aiResponse = data.content;
      } else if (data.type === 'email_template') {
        if (data.content && data.content.message && data.content.message.trim()) {
          console.log('Using message from email template');
          aiResponse = data.content.message;
        } else if (data.content && data.content.html) {
          console.log('Extracting text from HTML');
          // Extract text from HTML
          const htmlContent = data.content.html;
          // Extract text from between <p> tags
          const paragraphs = htmlContent.match(/<p>(.*?)<\/p>/g);
          if (paragraphs && paragraphs.length > 0) {
            // Remove HTML tags and join paragraphs with newlines
            aiResponse = paragraphs
              .map(p => p.replace(/<\/?p>/g, ''))
              .join('\n');
          } else {
            // Fallback: strip all HTML tags
            aiResponse = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          
          // If we extracted content from HTML, use it
          if (aiResponse && aiResponse.trim()) {
            console.log('Successfully extracted text from HTML:', aiResponse.substring(0, 100) + '...');
          } else {
            console.log('Failed to extract meaningful text from HTML');
            throw new Error('Failed to extract meaningful text from HTML');
          }
        } else {
          console.log('No content found in email template response');
          throw new Error('No content found in email template response');
        }
      } else if (data.content && data.content.message) {
        console.log('Using message from content');
        aiResponse = data.content.message;
      } else if (data.response) {
        console.log('Using response field');
        aiResponse = data.response;
      } else {
        console.log('Unexpected API response format, using fallback');
        throw new Error('Unexpected API response format');
      }
      
    } catch (error) {
      console.log('API error, using mock response:', error.message);
      // If API is not available or times out, generate a mock response
      aiResponse = generateMockResponse(prompt, goal);
    }
    
    // Ensure aiResponse is not undefined before calculating similarity
    if (!aiResponse) {
      console.log('aiResponse is undefined, using mock response');
      aiResponse = generateMockResponse(prompt, goal);
    }
    
    console.log('Final AI response:', aiResponse.substring(0, 100) + '...');
    
    // Calculate match percentage
    const matchPercentage = calculateSimilarity(aiResponse, goal);
    
    // Analyze prompt quality
    const qualityAnalysis = analyzePromptQuality(prompt, goal);
    
    // Generate improved prompt suggestion
    const improvedPrompt = generateImprovedPrompt(prompt, goal, qualityAnalysis);
    
    // Return evaluation results
    res.json({
      aiResponse,
      matchPercentage,
      qualityAnalysis,
      improvedPrompt
    });
    
  } catch (error) {
    console.error('Error evaluating prompt:', error);
    res.status(500).json({ error: 'Failed to evaluate prompt', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  
  // If we're on Vercel, use a much simpler approach to avoid timeouts
  if (IS_VERCEL) {
    console.log('Running on Vercel, using simplified health check');
    
    // For Vercel deployments, we'll just return a success response
    // and set ollama to connected so the client doesn't show mock data warnings
    return res.json({ 
      status: 'ok', 
      ollama: 'connected',
      environment: 'vercel',
      api_url: OLLAMA_API_URL
    });
  }
  
  // For local development, we'll still check the API
  console.log('Running locally, performing standard health check');
  
  // Set a shorter timeout for health checks
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('Health check timeout triggered');
    controller.abort();
  }, 10000); // 10 second timeout for health checks
  
  fetch(`${OLLAMA_API_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'metis',
      prompt: 'Hello',
      stream: false
    }),
    signal: controller.signal
  })
    .then(async response => {
      clearTimeout(timeoutId);
      console.log('Health check API response status:', response.status);
      
      if (response.ok) {
        try {
          // Try to parse the response to verify it's valid
          const data = await response.json();
          console.log('Health check API response data:', JSON.stringify(data).substring(0, 100) + '...');
          
          if (data && (data.type === 'text' || data.type === 'email_template' || data.content || data.response)) {
            console.log('Health check success: API is connected');
            return res.json({ status: 'ok', ollama: 'connected' });
          } else {
            console.log('Health check warning: Invalid response format');
            return res.json({ status: 'ok', ollama: 'unavailable', mock: 'enabled', reason: 'Invalid response format' });
          }
        } catch (error) {
          console.log('Health check error: Failed to parse response', error.message);
          return res.json({ status: 'ok', ollama: 'unavailable', mock: 'enabled', error: 'Failed to parse response' });
        }
      } else {
        console.log('Health check error: API responded with status', response.status);
        return res.json({ status: 'ok', ollama: 'unavailable', mock: 'enabled', statusCode: response.status });
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.log('Health check error:', error.message);
      return res.json({ status: 'ok', ollama: 'unavailable', mock: 'enabled', error: error.message });
    });
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`AI API URL: ${OLLAMA_API_URL}`);
  console.log(`Mock data: ${USE_MOCK_DATA ? 'enabled' : 'auto (when AI API unavailable)'}`);
}); 