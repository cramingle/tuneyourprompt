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
const IS_VERCEL = process.env.VERCEL === '1';

// Log environment on startup
console.log('Environment:', {
  PORT,
  OLLAMA_API_URL,
  IS_VERCEL
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
async function analyzePromptQuality(prompt, goal) {
  try {
    // First try to use AI for analysis
    const analysisPrompt = `
    Analyze this AI prompt: "${prompt}"
    Goal: "${goal}"
    
    Provide a detailed analysis with scores (0-100) and feedback for:
    1. Clarity: Does it specify tone, style, format, audience, or purpose?
    2. Detail: Is it specific and detailed enough?
    3. Relevance: Does it align with the stated goal?
    
    Format your response as JSON:
    {
      "clarity": {"score": number, "feedback": "string"},
      "detail": {"score": number, "feedback": "string"},
      "relevance": {"score": number, "feedback": "string"}
    }
    `;
    
    console.log('Sending analysis prompt to AI API');
    
    const controller = new AbortController();
    const timeoutDuration = IS_VERCEL ? 8000 : 15000; // shorter timeout for analysis
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    const apiResponse = await fetch(`${OLLAMA_API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'metis',
        prompt: analysisPrompt,
        stream: false
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      let analysisText = '';
      
      if (data.type === 'text' && data.content) {
        analysisText = data.content;
      } else if (data.response) {
        analysisText = data.response;
      } else if (data.content && data.content.message) {
        analysisText = data.content.message;
      }
      
      // Try to extract JSON from the response
      try {
        // Look for JSON pattern in the text
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const analysisData = JSON.parse(jsonStr);
          
          // Validate the structure
          if (analysisData.clarity && analysisData.detail && analysisData.relevance) {
            console.log('Successfully parsed AI analysis');
            return analysisData;
          }
        }
      } catch (jsonError) {
        console.log('Failed to parse JSON from AI response:', jsonError);
      }
    }
    
    // If AI analysis fails, fall back to rule-based analysis
    console.log('Falling back to rule-based analysis');
  } catch (error) {
    console.log('Error in AI analysis, falling back to rule-based:', error.message);
  }
  
  // Fallback to rule-based analysis
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
async function generateImprovedPrompt(originalPrompt, goal, analysis) {
  try {
    // First try to use AI for generating an improved prompt
    const improvePrompt = `
    Original prompt: "${originalPrompt}"
    Goal: "${goal}"
    
    Create an improved version of this prompt that will better achieve the stated goal.
    The improved prompt should address any issues with clarity, detail, and relevance.
    
    Return ONLY the improved prompt text with no additional explanation.
    `;
    
    console.log('Sending improve prompt request to AI API');
    
    const controller = new AbortController();
    const timeoutDuration = IS_VERCEL ? 8000 : 15000; // shorter timeout
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    const apiResponse = await fetch(`${OLLAMA_API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'metis',
        prompt: improvePrompt,
        stream: false
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      let improvedText = '';
      
      if (data.type === 'text' && data.content) {
        improvedText = data.content;
      } else if (data.response) {
        improvedText = data.response;
      } else if (data.content && data.content.message) {
        improvedText = data.content.message;
      }
      
      if (improvedText && improvedText.trim()) {
        console.log('Successfully generated AI improved prompt');
        return improvedText.trim();
      }
    }
    
    // If AI improvement fails, fall back to rule-based improvement
    console.log('Falling back to rule-based prompt improvement');
  } catch (error) {
    console.log('Error in AI prompt improvement, falling back to rule-based:', error.message);
  }
  
  // Fallback to rule-based improvement
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

// API endpoint to evaluate prompts
app.post('/api/evaluate', async (req, res) => {
  try {
    const { prompt, goal } = req.body;
    
    if (!prompt || !goal) {
      return res.status(400).json({ error: 'Prompt and goal are required' });
    }
    
    let aiResponse;
    
    // Try to call external API
    try {
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
        console.log('Unexpected API response format');
        throw new Error('Unexpected API response format');
      }
      
    } catch (error) {
      console.log('API error:', error.message);
      // Return the actual error
      return res.status(500).json({ 
        error: 'API error', 
        details: error.message,
        message: 'Failed to get response from AI API. Please try again later.'
      });
    }
    
    // Ensure aiResponse is not undefined before calculating similarity
    if (!aiResponse) {
      console.log('aiResponse is undefined');
      return res.status(500).json({ 
        error: 'Empty response', 
        message: 'Received empty response from AI API. Please try again later.'
      });
    }
    
    console.log('Final AI response:', aiResponse.substring(0, 100) + '...');
    
    // Calculate match percentage
    const matchPercentage = calculateSimilarity(aiResponse, goal);
    
    // Analyze prompt quality
    const qualityAnalysis = await analyzePromptQuality(prompt, goal);
    
    // Generate improved prompt suggestion
    const improvedPrompt = await generateImprovedPrompt(prompt, goal, qualityAnalysis);
    
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

// API endpoint to generate responses with a specific prompt
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    let response;
    
    // Try to call external API
    try {
      // Set a timeout based on environment - shorter for Vercel
      const controller = new AbortController();
      const timeoutDuration = IS_VERCEL ? 10000 : 30000; // 10 seconds for Vercel, 30 seconds for local
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      const apiResponse = await fetch(`${OLLAMA_API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'metis',
          prompt: prompt,
          stream: false
        }),
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!apiResponse.ok) {
        throw new Error(`API responded with status: ${apiResponse.status}`);
      }
      
      const data = await apiResponse.json();
      
      // Extract the content based on the response type
      if (data.type === 'text' && data.content) {
        console.log('Using text content');
        response = data.content;
      } else if (data.type === 'email_template') {
        if (data.content && data.content.message && data.content.message.trim()) {
          console.log('Using message from email template');
          response = data.content.message;
        } else if (data.content && data.content.html) {
          console.log('Extracting text from HTML');
          // Extract text from HTML
          const htmlContent = data.content.html;
          // Extract text from between <p> tags
          const paragraphs = htmlContent.match(/<p>(.*?)<\/p>/g);
          if (paragraphs && paragraphs.length > 0) {
            // Remove HTML tags and join paragraphs with newlines
            response = paragraphs
              .map(p => p.replace(/<\/?p>/g, ''))
              .join('\n');
          } else {
            // Fallback: strip all HTML tags
            response = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        } else {
          console.log('No content found in email template response');
          throw new Error('No content found in email template response');
        }
      } else if (data.content && data.content.message) {
        response = data.content.message;
      } else if (data.response) {
        response = data.response;
      } else {
        throw new Error('Unexpected API response format');
      }
      
    } catch (error) {
      console.log('API error:', error.message);
      return res.status(500).json({ 
        error: 'API error', 
        details: error.message,
        message: 'Failed to get response from AI API. Please try again later.'
      });
    }
    
    // Return the response
    res.json({ response });
    
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check if Ollama API is available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${OLLAMA_API_URL}/ai/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('Health check response:', data);
          
          if (data && data.status === 'ok') {
            return res.json({ 
              status: 'ok', 
              ollama: 'connected', 
              environment: IS_VERCEL ? 'vercel' : 'local',
              api_url: OLLAMA_API_URL
            });
          } else {
            return res.json({ status: 'ok', ollama: 'unavailable', reason: 'Invalid response format' });
          }
        } catch (error) {
          console.log('Health check error:', error.message);
          return res.json({ status: 'ok', ollama: 'unavailable', error: 'Failed to parse response' });
        }
      } else {
        return res.json({ status: 'ok', ollama: 'unavailable', statusCode: response.status });
      }
    } catch (error) {
      console.log('Health check error:', error.message);
      return res.json({ status: 'ok', ollama: 'unavailable', error: error.message });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`AI API URL: ${OLLAMA_API_URL}`);
}); 