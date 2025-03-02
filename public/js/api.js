// api.js - API-related functions for the application

/**
 * Check server health
 * @returns {Promise<boolean>} - Whether the server is healthy
 */
export async function checkServerHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        const response = await fetch('/api/health', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Server health:', data);
            
            // Always trust the server's response about API availability
            if (data.ollama === 'connected') {
                console.log('AI API is available');
                
                // If we're on Vercel, log additional information
                if (data.environment === 'vercel') {
                    console.log('Running on Vercel environment with API URL:', data.api_url);
                }
                
                return true;
            } else {
                console.log('AI API is not available:', data);
                return false;
            }
        } else {
            console.warn('Server health check failed with status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Server connection error:', error);
        return false;
    }
}

/**
 * Evaluate a prompt
 * @param {string} promptText - The prompt to evaluate
 * @param {string} goalText - The goal of the prompt
 * @param {Function} onSuccess - Callback for success
 * @param {Function} onError - Callback for error
 * @returns {Promise} - The evaluation promise
 */
export async function evaluatePrompt(promptText, goalText, onSuccess, onError) {
    // Track retries
    let retries = 0;
    const maxRetries = 2;
    
    async function attemptEvaluation() {
        try {
            // Update loading message if retrying
            if (retries > 0) {
                onError(`RETRY ATTEMPT ${retries}/${maxRetries}...`, false);
            }
            
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout
            
            // Call the API to evaluate the prompt
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: promptText,
                    goal: goalText
                }),
                signal: controller.signal
            });
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || errorData.error || `Server responded with status: ${response.status}`;
                console.error('Error response data:', errorData);
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // Call success callback
            onSuccess(data);
            
        } catch (error) {
            console.error('Error:', error);
            
            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                console.log('Request timed out');
                
                if (retries < maxRetries) {
                    retries++;
                    console.log(`Retry attempt ${retries}/${maxRetries} after timeout`);
                    
                    // Wait a moment before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try again
                    return attemptEvaluation();
                } else {
                    onError(`The request timed out. The server might be busy. Please try again later.`, true);
                }
            } else if (retries < maxRetries) {
                retries++;
                console.log(`Retry attempt ${retries}/${maxRetries}`);
                
                // Wait a moment before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Try again
                return attemptEvaluation();
            } else {
                onError(`An error occurred while evaluating your prompt: ${error.message}. Please try again later.`, true);
            }
        }
    }
    
    // Start the evaluation process
    return attemptEvaluation();
}

/**
 * Generate a response using an improved prompt
 * @param {string} improvedPrompt - The improved prompt to use
 * @param {string} goalText - The goal of the prompt
 * @param {Function} onSuccess - Callback for success
 * @param {Function} onError - Callback for error
 * @param {Function} onRetry - Callback for retry attempts
 * @returns {Promise} - The generation promise
 */
export async function generateResponse(improvedPrompt, goalText, onSuccess, onError, onRetry) {
    // Track retries
    let retries = 0;
    const maxRetries = 2;
    
    async function attemptGeneration() {
        try {
            // Update loading message if retrying
            if (retries > 0) {
                onRetry(`RETRY ATTEMPT ${retries}/${maxRetries}...`);
            }
            
            console.log('Sending request to /api/generate with prompt:', improvedPrompt.substring(0, 100) + '...');
            
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout
            
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: improvedPrompt,
                    goal: goalText
                }),
                signal: controller.signal
            });
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || errorData.error || `Server responded with status: ${response.status}`;
                console.error('Error response data:', errorData);
                
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            
            // Call success callback
            onSuccess(data);
            
        } catch (error) {
            console.error('Error generating response:', error);
            
            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                console.log('Request timed out');
                
                if (retries < maxRetries) {
                    retries++;
                    console.log(`Retry attempt ${retries}/${maxRetries} after timeout`);
                    
                    // Wait a moment before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try again
                    return attemptGeneration();
                } else {
                    onError(`The request timed out. The server might be busy. Please try again later.`);
                }
            } else if (error.message.includes('aborted') || error.message.includes('Failed to generate') || error.message.includes('500')) {
                // Server error or aborted request
                if (retries < maxRetries) {
                    retries++;
                    console.log(`Retry attempt ${retries}/${maxRetries} after server error`);
                    
                    // Wait a moment before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try again
                    return attemptGeneration();
                } else {
                    onError(`The server encountered an error. Please try again later.`);
                }
            } else {
                // Other errors
                onError(`${error.message || 'Failed to generate response. Please try again.'}`);
            }
        }
    }
    
    // Start the generation process
    return attemptGeneration();
}

/**
 * Continue a chat conversation
 * @param {string} message - The user's message
 * @param {string} goalText - The original goal
 * @param {string} chatHistory - The chat history
 * @param {Function} onSuccess - Callback for success
 * @param {Function} onError - Callback for error
 * @param {Function} onRetry - Callback for retry attempts
 * @returns {Promise} - The chat continuation promise
 */
export async function continueChatConversation(message, goalText, chatHistory, onSuccess, onError, onRetry) {
    // Track retries
    let retries = 0;
    const maxRetries = 2;
    
    async function attemptContinueChat() {
        try {
            // Update loading message if retrying
            if (retries > 0) {
                onRetry(`RETRY ATTEMPT ${retries}/${maxRetries}...`);
            }
            
            // Create a prompt that includes context
            const contextPrompt = `
The following is a conversation between a user and an AI assistant.
The user's original goal was: "${goalText}"

Previous conversation:
${chatHistory}

User's new message: ${message}

Please respond to the user's new message, taking into account the context of the previous conversation and their original goal.
`;
            
            // Create an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout
            
            // Send the request to the API
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: contextPrompt,
                    goal: goalText
                }),
                signal: controller.signal
            });
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Call success callback
            onSuccess(data);
            
        } catch (error) {
            console.error('Error in continue chat:', error);
            
            // Check if it's a timeout error
            if (error.name === 'AbortError') {
                console.log('Request timed out');
                
                if (retries < maxRetries) {
                    retries++;
                    console.log(`Retry attempt ${retries}/${maxRetries} after timeout`);
                    
                    // Wait a moment before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try again
                    return attemptContinueChat();
                } else {
                    onError(`The request timed out. The server might be busy. Please try again later.`);
                }
            } else if (error.message.includes('aborted') || error.message.includes('Failed to generate') || error.message.includes('500')) {
                // Server error or aborted request
                if (retries < maxRetries) {
                    retries++;
                    console.log(`Retry attempt ${retries}/${maxRetries} after server error`);
                    
                    // Wait a moment before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try again
                    return attemptContinueChat();
                } else {
                    onError(`The server encountered an error. Please try again later.`);
                }
            } else {
                // Other errors
                onError(`Error: ${error.message}`);
            }
        }
    }
    
    // Start the continue chat process
    return attemptContinueChat();
} 