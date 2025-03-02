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

// Helper function to analyze prompt quality
async function analyzePromptQuality(prompt, goal) {
  try {
    // First try to use AI for analysis
    const analysisPrompt = `
    Analyze the quality of this prompt:
    
    Prompt: "${prompt}"
    Goal: "${goal}"
    
    Evaluate the prompt on these criteria:
    1. Clarity: Is the prompt clear and specific about what it's asking for?
    2. Detail: Does the prompt provide enough detail and context?
    3. Relevance: Does the prompt align with the stated goal?
    
    For each criterion, provide a score from 0-100 and specific feedback.
    
    Return your analysis in this JSON format:
    {
      "clarity": {
        "score": <number>,
        "feedback": "<specific feedback>"
      },
      "detail": {
        "score": <number>,
        "feedback": "<specific feedback>"
      },
      "relevance": {
        "score": <number>,
        "feedback": "<specific feedback>"
      }
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
          } else {
            console.log('AI analysis missing required fields, falling back to rule-based');
          }
        } else {
          console.log('No JSON found in AI response, falling back to rule-based');
        }
      } catch (jsonError) {
        console.log('Failed to parse JSON from AI response:', jsonError);
      }
    } else {
      console.log(`API responded with status: ${apiResponse.status}, falling back to rule-based analysis`);
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
  const promptEndsWithQuestion = prompt.trim().endsWith('?');
  const hasInstructionWords = /please|create|write|generate|make/i.test(prompt);
  
  if (hasClarity && hasInstructionWords) {
    analysis.clarity.score = 90;
    analysis.clarity.feedback = 'Excellent clarity! Your prompt clearly specifies what you want.';
  } else if (hasClarity || hasInstructionWords) {
    analysis.clarity.score = 70;
    analysis.clarity.feedback = 'Good clarity, but consider being more specific about what you want.';
  } else if (promptEndsWithQuestion) {
    analysis.clarity.score = 50;
    analysis.clarity.feedback = 'Your prompt is a question, which may lead to explanations rather than the content you want. Try using direct instructions.';
  } else {
    analysis.clarity.score = 30;
    analysis.clarity.feedback = 'Your prompt lacks clarity. Consider specifying tone, style, format, audience, or purpose.';
  }
  
  // Check detail
  const wordCount = prompt.split(/\s+/).length;
  const sentenceCount = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const hasExamples = prompt.includes('example') || prompt.includes('like') || prompt.includes('such as');
  
  if (wordCount > 20 && hasExamples) {
    analysis.detail.score = 90;
    analysis.detail.feedback = 'Excellent level of detail with helpful examples!';
  } else if (wordCount > 15) {
    analysis.detail.score = 80;
    analysis.detail.feedback = 'Good level of detail. Consider adding examples for even better results.';
  } else if (wordCount > 10) {
    analysis.detail.score = 60;
    analysis.detail.feedback = 'Moderate detail. Adding more specific requirements would improve results.';
  } else if (sentenceCount > 1) {
    analysis.detail.score = 40;
    analysis.detail.feedback = 'Limited detail. Try expanding your prompt with more specific instructions.';
  } else {
    analysis.detail.score = 20;
    analysis.detail.feedback = 'Very limited detail. Short prompts often lead to generic responses.';
  }
  
  // Check relevance
  const goalKeywords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const promptLower = prompt.toLowerCase();
  const matchingKeywords = goalKeywords.filter(keyword => promptLower.includes(keyword));
  const relevanceScore = Math.round((matchingKeywords.length / Math.max(1, goalKeywords.length)) * 100);
  
  if (relevanceScore > 80) {
    analysis.relevance.score = 90;
    analysis.relevance.feedback = 'Excellent alignment with your goal!';
  } else if (relevanceScore > 60) {
    analysis.relevance.score = 75;
    analysis.relevance.feedback = 'Good alignment with your goal, but some key elements might be missing.';
  } else if (relevanceScore > 40) {
    analysis.relevance.score = 60;
    analysis.relevance.feedback = 'Moderate alignment with your goal. Consider including more key elements from your goal.';
  } else if (relevanceScore > 20) {
    analysis.relevance.score = 40;
    analysis.relevance.feedback = 'Limited alignment with your goal. Your prompt is missing many key elements from your goal.';
  } else {
    analysis.relevance.score = 20;
    analysis.relevance.feedback = 'Poor alignment with your goal. Your prompt seems unrelated to what you want to achieve.';
  }
  
  console.log('Rule-based analysis scores:', {
    clarity: analysis.clarity.score,
    detail: analysis.detail.score,
    relevance: analysis.relevance.score
  });
  
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
      } else {
        console.log('AI returned empty improved prompt, falling back to rule-based improvement');
      }
    } else {
      console.log(`API responded with status: ${apiResponse.status}, falling back to rule-based improvement`);
    }
    
    // If AI improvement fails, fall back to rule-based improvement
    console.log('Falling back to rule-based prompt improvement');
  } catch (error) {
    console.log('Error in AI prompt improvement, falling back to rule-based:', error.message);
  }
  
  // Fallback to rule-based improvement
  let suggestion = originalPrompt;
  let improvements = [];
  
  // Add clarity improvements if needed
  if (analysis.clarity.score < 70) {
    if (goal.toLowerCase().includes('funny') && !suggestion.toLowerCase().includes('humor') && !suggestion.toLowerCase().includes('funny')) {
      improvements.push('add humor');
      suggestion = suggestion.replace(/\.$/, '') + ' Make it humorous and entertaining.';
    } 
    
    if (goal.toLowerCase().includes('detailed') && !suggestion.toLowerCase().includes('detail')) {
      improvements.push('add details');
      suggestion = suggestion.replace(/\.$/, '') + ' Include specific details and vivid descriptions.';
    }
    
    if (!suggestion.toLowerCase().includes('tone') && !suggestion.toLowerCase().includes('style')) {
      improvements.push('specify tone');
      suggestion = suggestion.replace(/\.$/, '') + ' Use a clear and professional tone.';
    }
  }
  
  // Add relevance improvements if needed
  if (analysis.relevance.score < 70) {
    const goalKeywords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const missingKeywords = goalKeywords.filter(keyword => 
      !suggestion.toLowerCase().includes(keyword)
    );
    
    if (missingKeywords.length > 0) {
      improvements.push('include key elements from goal');
      suggestion = suggestion.replace(/\.$/, '') + 
        ` Include these key elements: ${missingKeywords.join(', ')}.`;
    }
  }
  
  // Add detail improvements if needed
  if (analysis.detail.score < 70) {
    const wordCount = suggestion.split(/\s+/).length;
    if (wordCount < 15) {
      improvements.push('add more detail');
      suggestion = suggestion.replace(/\.$/, '') + ' Provide more specific instructions and context.';
    }
  }
  
  // Log the improvements made
  if (improvements.length > 0) {
    console.log('Rule-based improvements made:', improvements.join(', '));
  } else {
    console.log('No rule-based improvements needed, original prompt was good');
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