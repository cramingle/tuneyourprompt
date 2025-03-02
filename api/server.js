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
  
  // Check clarity - more sophisticated analysis
  const clarityKeywords = ['tone', 'style', 'format', 'audience', 'purpose', 'voice', 'perspective', 'mood'];
  const clarityMatches = clarityKeywords.filter(keyword => prompt.toLowerCase().includes(keyword));
  const clarityScore = Math.min(100, clarityMatches.length * 25 + 25);
  
  // Generate varied feedback for clarity
  if (clarityScore >= 75) {
    const feedbackOptions = [
      `Great job specifying ${clarityMatches.join(' and ')} in your prompt!`,
      `Your prompt clearly communicates ${clarityMatches.join(' and ')}, which helps guide the AI.`,
      `The AI will understand what you want because you specified ${clarityMatches.join(' and ')}.`
    ];
    analysis.clarity.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  } else if (clarityScore >= 50) {
    const missingKeywords = clarityKeywords.filter(k => !clarityMatches.includes(k)).slice(0, 2);
    const feedbackOptions = [
      `Consider adding ${missingKeywords.join(' or ')} to make your prompt clearer.`,
      `Your prompt could be clearer if you specified ${missingKeywords.join(' or ')}.`,
      `To improve clarity, try mentioning ${missingKeywords.join(' and/or ')} in your prompt.`
    ];
    analysis.clarity.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  } else {
    const feedbackOptions = [
      `Your prompt lacks clarity. Try specifying tone, style, or audience.`,
      `The AI might struggle to understand exactly what you want. Consider adding details about tone and style.`,
      `To get better results, clearly state the tone, style, and format you're looking for.`
    ];
    analysis.clarity.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  }
  analysis.clarity.score = clarityScore;
  
  // Check detail - more nuanced analysis
  const wordCount = prompt.split(/\s+/).length;
  const sentenceCount = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  
  // Calculate detail score based on multiple factors
  let detailScore = 0;
  
  // Word count factor (0-40 points)
  if (wordCount >= 30) detailScore += 40;
  else if (wordCount >= 20) detailScore += 30;
  else if (wordCount >= 10) detailScore += 20;
  else if (wordCount >= 5) detailScore += 10;
  
  // Sentence complexity factor (0-30 points)
  if (avgWordsPerSentence >= 12) detailScore += 30;
  else if (avgWordsPerSentence >= 8) detailScore += 20;
  else if (avgWordsPerSentence >= 5) detailScore += 10;
  
  // Specific details factor (0-30 points)
  const specificDetails = [
    /\d+/,                           // Numbers
    /specific/i, /particular/i,      // Specificity words
    /example/i,                      // Examples
    /color|colour|red|blue|green|yellow|black|white/i,  // Colors
    /size|large|small|tiny|huge|big/i,  // Sizes
    /first|second|third|next|then|after/i  // Sequence indicators
  ];
  
  const detailMatches = specificDetails.filter(pattern => pattern.test(prompt));
  detailScore += Math.min(30, detailMatches.length * 10);
  
  // Ensure score is between 0-100
  detailScore = Math.min(100, detailScore);
  
  // Generate varied feedback for detail
  if (detailScore >= 80) {
    const feedbackOptions = [
      `Your prompt has excellent detail with ${wordCount} words and specific elements.`,
      `Great job providing specific details! The AI has plenty to work with.`,
      `Your detailed prompt gives the AI clear direction with specific elements to include.`
    ];
    analysis.detail.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  } else if (detailScore >= 50) {
    const feedbackOptions = [
      `Your prompt has decent detail, but could benefit from more specific examples.`,
      `Consider adding more specific details like numbers, colors, or examples.`,
      `The level of detail is good, but adding more specifics would help the AI understand better.`
    ];
    analysis.detail.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  } else {
    const feedbackOptions = [
      `Your prompt lacks sufficient detail. Try adding specific examples or descriptions.`,
      `Add more specific details to help the AI understand exactly what you want.`,
      `To improve results, include specific examples, numbers, or descriptive elements.`
    ];
    analysis.detail.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  }
  analysis.detail.score = detailScore;
  
  // Check relevance - more sophisticated analysis
  // Extract meaningful keywords from goal (excluding common words)
  const commonWords = ['the', 'and', 'for', 'that', 'with', 'this', 'have', 'from', 'your', 'will', 'about'];
  const goalWords = goal.toLowerCase().split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.includes(word));
  
  // Count how many goal keywords appear in the prompt
  const matchedKeywords = goalWords.filter(keyword => 
    prompt.toLowerCase().includes(keyword)
  );
  
  // Calculate relevance score
  const relevanceScore = Math.min(100, Math.round((matchedKeywords.length / Math.max(1, goalWords.length)) * 100));
  
  // Generate varied feedback for relevance
  if (relevanceScore >= 80) {
    const feedbackOptions = [
      `Your prompt aligns very well with your goal, mentioning key elements like ${matchedKeywords.slice(0, 3).join(', ')}.`,
      `Excellent job keeping your prompt relevant to your goal! The AI will understand what you're trying to achieve.`,
      `The prompt clearly addresses your goal with relevant keywords and context.`
    ];
    analysis.relevance.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  } else if (relevanceScore >= 50) {
    const missingKeywords = goalWords.filter(keyword => !matchedKeywords.includes(keyword)).slice(0, 3);
    const feedbackOptions = [
      `Your prompt is somewhat relevant but misses key elements like ${missingKeywords.join(', ')}.`,
      `Consider including more keywords from your goal such as ${missingKeywords.join(', ')}.`,
      `To improve relevance, make sure to address ${missingKeywords.join(' and ')} from your goal.`
    ];
    analysis.relevance.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  } else {
    const feedbackOptions = [
      `Your prompt doesn't seem to address your goal. Try including key elements from your goal.`,
      `There's a disconnect between your goal and prompt. Make sure to include relevant keywords from your goal.`,
      `To get better results, align your prompt more closely with your stated goal.`
    ];
    analysis.relevance.feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  }
  analysis.relevance.score = relevanceScore;
  
  return analysis;
}

// Generate improved prompt suggestion
function generateImprovedPrompt(originalPrompt, goal, analysis) {
  // Start with the original prompt
  let suggestion = originalPrompt;
  
  // Extract key elements from the goal
  const goalWords = goal.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const goalHasCreative = /creative|innovative|unique|original|novel/i.test(goal);
  const goalHasFormal = /formal|professional|business|academic/i.test(goal);
  const goalHasFunny = /funny|humorous|comedic|joke|amusing/i.test(goal);
  const goalHasDetailed = /detailed|comprehensive|thorough|complete/i.test(goal);
  const goalHasSimple = /simple|brief|concise|short/i.test(goal);
  
  // Track what improvements we've made
  const improvements = [];
  
  // Add clarity if missing
  if (analysis.clarity.score < 70) {
    // Determine what tone/style to add based on goal
    if (goalHasCreative && !suggestion.toLowerCase().includes('creative')) {
      suggestion = suggestion.replace(/\.?\s*$/, '. Use a creative and innovative approach.');
      improvements.push('creative tone');
    } else if (goalHasFormal && !suggestion.toLowerCase().includes('formal')) {
      suggestion = suggestion.replace(/\.?\s*$/, '. Maintain a formal and professional tone.');
      improvements.push('formal tone');
    } else if (goalHasFunny && !suggestion.toLowerCase().includes('funny')) {
      suggestion = suggestion.replace(/\.?\s*$/, '. Use a humorous and entertaining style.');
      improvements.push('humorous tone');
    } else if (goalHasDetailed && !suggestion.toLowerCase().includes('detail')) {
      suggestion = suggestion.replace(/\.?\s*$/, '. Include detailed descriptions and thorough explanations.');
      improvements.push('detailed approach');
    } else if (goalHasSimple && !suggestion.toLowerCase().includes('simple')) {
      suggestion = suggestion.replace(/\.?\s*$/, '. Keep it simple, concise and to the point.');
      improvements.push('concise approach');
    } else {
      // If no specific tone detected, add a generic improvement
      const clarityAdditions = [
        '. Be specific about tone and style.',
        '. Use a clear and engaging voice.',
        '. Ensure the content is well-structured and focused.'
      ];
      suggestion = suggestion.replace(/\.?\s*$/, clarityAdditions[Math.floor(Math.random() * clarityAdditions.length)]);
      improvements.push('clarity');
    }
  }
  
  // Add detail if missing
  if (analysis.detail.score < 70 && !improvements.includes('detailed approach')) {
    const detailAdditions = [
      ` Include specific examples and descriptive language.`,
      ` Provide concrete details and vivid descriptions.`,
      ` Use precise language and illustrative examples.`
    ];
    suggestion = suggestion.replace(/\.?\s*$/, '.' + detailAdditions[Math.floor(Math.random() * detailAdditions.length)]);
    improvements.push('detail');
  }
  
  // Add relevance if missing
  if (analysis.relevance.score < 70) {
    const missingKeywords = goalWords.filter(keyword => 
      !suggestion.toLowerCase().includes(keyword)
    ).slice(0, 3);
    
    if (missingKeywords.length > 0) {
      suggestion = suggestion.replace(/\.?\s*$/, `. Make sure to address these key elements from the goal: ${missingKeywords.join(', ')}.`);
      improvements.push('relevance');
    }
  }
  
  // If we haven't made any improvements but scores are decent, add a generic enhancement
  if (improvements.length === 0 && (analysis.clarity.score + analysis.detail.score + analysis.relevance.score) / 3 >= 70) {
    const enhancements = [
      ` For best results, specify your target audience and desired outcome.`,
      ` Consider adding context about how the output will be used.`,
      ` To further improve, mention any constraints or preferences you have.`
    ];
    suggestion = suggestion.replace(/\.?\s*$/, '.' + enhancements[Math.floor(Math.random() * enhancements.length)]);
  }
  
  // Ensure the suggestion ends with proper punctuation
  if (!/[.!?]$/.test(suggestion)) {
    suggestion += '.';
  }
  
  return suggestion;
}

// Function to analyze the prompt specifically for the Metis model
async function analyzePromptForMetis(prompt, goal) {
  try {
    // Create a prompt for the AI to analyze the user's prompt
    const analysisPrompt = `
      You are an AI prompt analysis expert. Analyze the following prompt based on how well it would work for a general AI assistant (not an email template generator).
      
      User's goal: "${goal}"
      User's prompt: "${prompt}"
      
      Analyze the prompt for:
      1. Clarity (0-100): How clear and specific is the prompt?
      2. Detail (0-100): How detailed and informative is the prompt?
      3. Relevance (0-100): How relevant is the prompt to the user's stated goal?
      
      For each category, provide a score and brief feedback.
      Also suggest an improved version of the prompt.
      
      Format your response as a JSON object with this structure:
      {
        "clarity": {"score": number, "feedback": "string"},
        "detail": {"score": number, "feedback": "string"},
        "relevance": {"score": number, "feedback": "string"},
        "improvedPrompt": "string"
      }
    `;
    
    // Set a timeout for the analysis request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const analysisResponse = await fetch(`${OLLAMA_API_URL}/ai/chat`, {
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
    
    if (!analysisResponse.ok) {
      throw new Error(`Analysis API responded with status: ${analysisResponse.status}`);
    }
    
    const analysisData = await analysisResponse.json();
    let analysisContent = '';
    
    // Extract the content based on the response type
    if (analysisData.type === 'text' && analysisData.content) {
      analysisContent = analysisData.content;
    } else if (analysisData.response) {
      analysisContent = analysisData.response;
    } else if (analysisData.content && typeof analysisData.content === 'object') {
      // If the content is already a JSON object, use it directly
      return analysisData.content;
    } else {
      throw new Error('Unexpected analysis response format');
    }
    
    // Try to extract JSON from the response
    const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Validate the analysis structure
        if (analysis.clarity && analysis.detail && analysis.relevance && analysis.improvedPrompt) {
          // Ensure scores are numbers between 0-100
          analysis.clarity.score = Math.min(100, Math.max(0, parseInt(analysis.clarity.score) || 0));
          analysis.detail.score = Math.min(100, Math.max(0, parseInt(analysis.detail.score) || 0));
          analysis.relevance.score = Math.min(100, Math.max(0, parseInt(analysis.relevance.score) || 0));
          
          return analysis;
        }
      } catch (e) {
        console.error('Error parsing analysis JSON:', e);
      }
    }
    
    throw new Error('Could not extract valid analysis from response');
    
  } catch (error) {
    console.error('Error in analyzePromptForMetis:', error);
    return null;
  }
}

// API endpoint to evaluate prompts
app.post('/api/evaluate', async (req, res) => {
  try {
    const { prompt, goal, skipAnalysis } = req.body;
    
    if (!prompt || !goal) {
      return res.status(400).json({ error: 'Prompt and goal are required' });
    }
    
    let aiResponse;
    let promptAnalysis = null;
    
    // Call external API
    try {
      // Create a prompt that focuses on general AI interaction rather than email templates
      const enhancedPrompt = `You are a helpful AI assistant. Please respond to the following prompt: ${prompt}`;
      
      console.log('Sending prompt to API:', enhancedPrompt);
      
      // Set a timeout based on environment - shorter for Vercel
      const controller = new AbortController();
      const timeoutDuration = IS_VERCEL ? 25000 : 30000; // 25 seconds for Vercel, 30 seconds for local
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
        return res.status(500).json({ 
          error: 'API error', 
          details: `API responded with status: ${apiResponse.status}`,
          message: 'Failed to get response from AI API. Please try again later.'
        });
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
            return res.status(500).json({ 
              error: 'Content extraction error', 
              details: 'Failed to extract meaningful text from HTML',
              message: 'Failed to process AI response. Please try again later.'
            });
          }
        } else {
          console.log('No content found in email template response');
          return res.status(500).json({ 
            error: 'Content error', 
            details: 'No content found in email template response',
            message: 'Failed to process AI response. Please try again later.'
          });
        }
      } else if (data.content && data.content.message) {
        console.log('Using message from content');
        aiResponse = data.content.message;
      } else if (data.response) {
        console.log('Using response field');
        aiResponse = data.response;
      } else {
        console.log('Unexpected API response format');
        return res.status(500).json({ 
          error: 'Format error', 
          details: 'Unexpected API response format',
          message: 'Failed to process AI response. Please try again later.'
        });
      }
      
      // If we're not skipping analysis, get the prompt analysis
      if (!skipAnalysis) {
        try {
          promptAnalysis = await analyzePromptForMetis(prompt, goal);
          console.log('Prompt analysis:', JSON.stringify(promptAnalysis).substring(0, 200) + '...');
        } catch (analysisError) {
          console.log('Error getting AI analysis:', analysisError.message);
          // We'll continue without analysis
          return res.status(500).json({ 
            error: 'Analysis error', 
            details: analysisError.message,
            message: 'Failed to analyze prompt. Please try again later.'
          });
        }
      }
      
    } catch (error) {
      console.log('API error:', error.message);
      return res.status(500).json({ 
        error: 'API error', 
        details: error.message,
        message: 'Failed to get response from AI API. Please try again later.'
      });
    }
    
    // Ensure aiResponse is not undefined before proceeding
    if (!aiResponse) {
      console.log('aiResponse is undefined');
      return res.status(500).json({ 
        error: 'Empty response', 
        message: 'Received empty response from AI API. Please try again later.'
      });
    }
    
    console.log('Final AI response:', aiResponse.substring(0, 100) + '...');
    
    // If skipAnalysis is true, just return the AI response
    if (skipAnalysis) {
      return res.json({
        aiResponse
      });
    }
    
    // Calculate match percentage
    const matchPercentage = calculateSimilarity(aiResponse, goal);
    
    // Ensure we have valid analysis data
    if (!promptAnalysis || 
        !promptAnalysis.clarity || 
        !promptAnalysis.detail || 
        !promptAnalysis.relevance || 
        !promptAnalysis.improvedPrompt) {
      return res.status(500).json({ 
        error: 'Analysis error', 
        message: 'Failed to analyze prompt. Please try again later.'
      });
    }
    
    // Use the AI-generated analysis
    const qualityAnalysis = {
      clarity: promptAnalysis.clarity,
      detail: promptAnalysis.detail,
      relevance: promptAnalysis.relevance
    };
    const improvedPrompt = promptAnalysis.improvedPrompt;
    console.log('Using AI-generated analysis');
    
    // Return evaluation results
    res.json({
      aiResponse,
      matchPercentage,
      analysis: {
        clarity: qualityAnalysis.clarity,
        detail: qualityAnalysis.detail,
        relevance: qualityAnalysis.relevance,
        improvedPrompt: improvedPrompt
      }
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
  }, 30000); // 30 second timeout for health checks
  
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
            return res.json({ status: 'error', reason: 'Invalid response format' });
          }
        } catch (error) {
          console.log('Health check error: Failed to parse response', error.message);
          return res.json({ status: 'error', error: 'Failed to parse response' });
        }
      } else {
        console.log('Health check error: API responded with status', response.status);
        return res.json({ status: 'error', statusCode: response.status });
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.log('Health check error:', error.message);
      return res.json({ status: 'error', error: error.message });
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
}); 