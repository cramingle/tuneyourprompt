document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const progressFill = document.getElementById('progress-fill');
    const stepIndicator1 = document.getElementById('step-indicator-1');
    const stepIndicator2 = document.getElementById('step-indicator-2');
    const stepIndicator3 = document.getElementById('step-indicator-3');
    
    const chatMessages = document.getElementById('chat-messages');
    
    const goalInputArea = document.getElementById('goal-input-area');
    const promptInputArea = document.getElementById('prompt-input-area');
    const tryAgainArea = document.getElementById('try-again-area');
    
    const goalInput = document.getElementById('goal-input');
    const promptInput = document.getElementById('prompt-input');
    
    const goalNextBtn = document.getElementById('goal-next');
    const promptNextBtn = document.getElementById('prompt-next');
    const tryAgainBtn = document.getElementById('try-again');
    const startOverBtn = document.getElementById('start-over');
    
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    // Current step tracking
    let currentStep = 1;
    let ollamaAvailable = false;
    
    // Add typing animation effect
    function typeText(element, text, speed = 30) {
        let i = 0;
        element.textContent = '';
        
        return new Promise(resolve => {
            function type() {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, speed);
                } else {
                    resolve();
                }
            }
            type();
        });
    }
    
    // Helper function to add a message to the chat
    function addMessage(type, content, extraClasses = '', animate = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} ${extraClasses}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (typeof content === 'string') {
            if (animate && type === 'ai') {
                const paragraph = document.createElement('p');
                contentDiv.appendChild(paragraph);
                messageDiv.appendChild(contentDiv);
                chatMessages.appendChild(messageDiv);
                
                // Scroll to the bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Start typing animation
                typeText(paragraph, content, 15);
            } else {
                contentDiv.innerHTML = `<p>${content}</p>`;
                messageDiv.appendChild(contentDiv);
                chatMessages.appendChild(messageDiv);
            }
        } else {
            contentDiv.appendChild(content);
            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
        }
        
        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }
    
    // Update progress bar and indicators
    function updateProgress(step) {
        currentStep = step;
        
        // Update progress bar with animation
        progressFill.style.width = `${(step / 3) * 100}%`;
        
        // Update step indicators
        stepIndicator1.className = step >= 1 ? 'step active' : 'step';
        stepIndicator2.className = step >= 2 ? 'step active' : 'step';
        stepIndicator3.className = step >= 3 ? 'step active' : 'step';
        
        if (step > 1) {
            stepIndicator1.className = 'step completed';
        }
        if (step > 2) {
            stepIndicator2.className = 'step completed';
        }
        
        // Show/hide input areas with smooth transitions
        if (step === 1) {
            goalInputArea.className = 'input-area';
            promptInputArea.className = 'input-area hidden';
            tryAgainArea.className = 'input-area hidden';
        } else if (step === 2) {
            goalInputArea.className = 'input-area hidden';
            promptInputArea.className = 'input-area';
            tryAgainArea.className = 'input-area hidden';
        } else if (step === 3) {
            goalInputArea.className = 'input-area hidden';
            promptInputArea.className = 'input-area hidden';
            tryAgainArea.className = 'input-area';
        }
    }
    
    // Event listeners
    goalNextBtn.addEventListener('click', () => {
        const goalText = goalInput.value.trim();
        
        if (goalText === '') {
            alert('Please enter your goal first.');
            return;
        }
        
        // Add user message
        addMessage('user', goalText);
        
        // Add system response
        addMessage('system', '<i class="fas fa-robot fa-xs"></i> Great! Now write a prompt that you think will get the AI to create what you want.');
        
        // Move to step 2
        updateProgress(2);
        
        // Focus on prompt input
        promptInput.focus();
    });
    
    promptNextBtn.addEventListener('click', async () => {
        const promptText = promptInput.value.trim();
        const goalText = goalInput.value.trim();
        
        if (promptText === '') {
            alert('Please enter your prompt first.');
            return;
        }
        
        // Add user message
        addMessage('user', promptText);
        
        // Show loading overlay
        loadingOverlay.style.display = 'flex';
        
        // Track retries
        let retries = 0;
        const maxRetries = 2;
        
        async function attemptEvaluation() {
            try {
                // Update loading message
                const loadingText = document.querySelector('.loading-overlay p');
                if (retries > 0) {
                    loadingText.textContent = `RETRY ATTEMPT ${retries}/${maxRetries}...`;
                }
                
                // Create an AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
                
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
                    throw new Error(errorData.error || `Server responded with status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Hide loading overlay
                loadingOverlay.style.display = 'none';
                
                // Add AI response message with typing animation
                addMessage('ai', data.aiResponse, '', true);
                
                // Add feedback message after a short delay
                setTimeout(() => {
                    // Update analysis panel instead of creating feedback element
                    updateAnalysisPanel(data.analysis);
                    
                    // Move to step 3
                    updateProgress(3);
                }, 1000);
                
            } catch (error) {
                console.error('Error:', error);
                
                // Check if it's a timeout error
                if (error.name === 'AbortError') {
                    console.log('Request timed out');
                    
                    if (retries < maxRetries) {
                        retries++;
                        console.log(`Retry attempt ${retries}/${maxRetries} after timeout`);
                        
                        // Update loading message
                        const loadingText = document.querySelector('.loading-overlay p');
                        loadingText.textContent = `RETRY ATTEMPT ${retries}/${maxRetries}...`;
                        
                        // Wait a moment before retrying
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        // Try again
                        return attemptEvaluation();
                    } else {
                        // Hide loading overlay
                        loadingOverlay.style.display = 'none';
                        
                        addMessage('system', `<i class="fas fa-clock fa-xs"></i> The request timed out. The server might be busy. Please try again later.`);
                        
                        // Move to step 3 anyway so user can try again
                        updateProgress(3);
                    }
                } else if (retries < maxRetries) {
                    retries++;
                    console.log(`Retry attempt ${retries}/${maxRetries}`);
                    
                    // Update loading message
                    const loadingText = document.querySelector('.loading-overlay p');
                    loadingText.textContent = `RETRY ATTEMPT ${retries}/${maxRetries}...`;
                    
                    // Wait a moment before retrying
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Try again
                    return attemptEvaluation();
                } else {
                    // Hide loading overlay
                    loadingOverlay.style.display = 'none';
                    
                    addMessage('system', `<i class="fas fa-exclamation-triangle fa-xs"></i> An error occurred while evaluating your prompt: ${error.message}. Please try again later.`);
                    
                    // Move to step 3 anyway so user can try again
                    updateProgress(3);
                }
            }
        }
        
        // Start the evaluation process
        attemptEvaluation();
    });
    
    tryAgainBtn.addEventListener('click', () => {
        // Clear the prompt input
        promptInput.value = '';
        
        // Add system message
        addMessage('system', '<i class="fas fa-redo fa-xs"></i> Let\'s try another prompt for the same goal.');
        
        // Move back to step 2
        updateProgress(2);
        
        // Focus on prompt input
        promptInput.focus();
    });
    
    startOverBtn.addEventListener('click', () => {
        // Confirm before starting over
        if (confirm('Are you sure you want to start over with a new goal?')) {
            // Clear inputs
            goalInput.value = '';
            promptInput.value = '';
            
            // Clear chat messages except the first welcome message
            while (chatMessages.children.length > 1) {
                chatMessages.removeChild(chatMessages.lastChild);
            }
            
            // Add system message
            addMessage('system', '<i class="fas fa-sync fa-xs"></i> Let\'s start over with a new goal.');
            
            // Move back to step 1
            updateProgress(1);
            
            // Focus on goal input
            goalInput.focus();
        }
    });
    
    // Handle textarea auto-resize
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    });
    
    // Helper function to check server health
    async function checkServerHealth() {
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
                    ollamaAvailable = true;
                    console.log('AI API is available');
                    
                    // If we're on Vercel, log additional information
                    if (data.environment === 'vercel') {
                        console.log('Running on Vercel environment with API URL:', data.api_url);
                    }
                } else {
                    ollamaAvailable = false;
                    console.warn('AI API is not available, using mock responses:', data);
                    addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> Note: AI API is not available. The app will use simulated AI responses.');
                }
            } else {
                console.warn('Server health check failed with status:', response.status);
                ollamaAvailable = false;
                addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> Warning: Server health check failed. The app will use simulated AI responses.');
            }
        } catch (error) {
            console.error('Server connection error:', error);
            ollamaAvailable = false;
            if (error.name === 'AbortError') {
                addMessage('system', '<i class="fas fa-clock fa-xs"></i> Warning: Server health check timed out. The app will use simulated AI responses.');
            } else {
                addMessage('system', '<i class="fas fa-times-circle fa-xs"></i> Error: Cannot connect to the server. Please check your connection and reload the page.');
            }
        }
    }
    
    // Check server health on page load
    checkServerHealth();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Enter key with Ctrl or Cmd to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (currentStep === 1 && goalInput.value.trim() !== '') {
                goalNextBtn.click();
            } else if (currentStep === 2 && promptInput.value.trim() !== '') {
                promptNextBtn.click();
            }
        }
    });

    // Add these new functions before the existing evaluatePrompt function
    function updateAnalysisPanel(analysis) {
        const analysisPanel = document.getElementById('analysis-panel');
        const matchValue = document.getElementById('match-value');
        const matchBarFill = document.getElementById('match-bar-fill');
        
        // Update match score
        const overallScore = Math.round((analysis.clarity.score + analysis.detail.score + analysis.relevance.score) / 3);
        matchValue.textContent = `${overallScore}%`;
        matchBarFill.style.width = `${overallScore}%`;
        
        // Update color based on score
        if (overallScore >= 75) {
            matchBarFill.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
        } else if (overallScore >= 50) {
            matchBarFill.style.background = 'linear-gradient(90deg, #FFC107, #FFEB3B)';
        } else {
            matchBarFill.style.background = 'linear-gradient(90deg, #F44336, #FF9800)';
        }
        
        // Update clarity
        document.getElementById('clarity-score').textContent = analysis.clarity.score;
        document.getElementById('clarity-bar').style.width = `${analysis.clarity.score}%`;
        document.getElementById('clarity-feedback').textContent = analysis.clarity.feedback;
        
        // Update detail
        document.getElementById('detail-score').textContent = analysis.detail.score;
        document.getElementById('detail-bar').style.width = `${analysis.detail.score}%`;
        document.getElementById('detail-feedback').textContent = analysis.detail.feedback;
        
        // Update relevance
        document.getElementById('relevance-score').textContent = analysis.relevance.score;
        document.getElementById('relevance-bar').style.width = `${analysis.relevance.score}%`;
        document.getElementById('relevance-feedback').textContent = analysis.relevance.feedback;
        
        // Update improved prompt
        document.getElementById('improved-prompt-text').textContent = analysis.improvedPrompt;
        
        // Show the panel
        analysisPanel.classList.remove('hidden');
    }

    // Replace the existing evaluatePrompt function with this updated version
    async function evaluatePrompt(prompt, goal) {
        let retryCount = 0;
        const maxRetries = 2;
        const retryDelay = 2000;
        
        function setLoadingMessage() {
            loadingOverlay.classList.add('active');
            loadingMessage.textContent = 'Analyzing your prompt...';
        }
        
        setLoadingMessage();
        
        async function attemptEvaluation() {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timed out')), 30000);
            });
            
            try {
                const response = await Promise.race([
                    fetch('/api/evaluate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ prompt, goal }),
                        signal: controller.signal
                    }),
                    timeoutPromise
                ]);
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Add AI response to chat
                    addMessage('ai', data.aiResponse);
                    
                    // Update analysis panel instead of adding feedback to chat
                    updateAnalysisPanel(data.analysis);
                    
                    // Update progress after a delay
                    setTimeout(() => {
                        updateProgress(3);
                    }, 500);
                } else {
                    throw new Error(`Server responded with ${response.status}`);
                }
            } catch (error) {
                console.error('Evaluation error:', error);
                
                if (error.name === 'AbortError' || error.message === 'Request timed out') {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Retry attempt ${retryCount}...`);
                        loadingMessage.textContent = `Request timed out. Retrying (${retryCount}/${maxRetries})...`;
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                        return attemptEvaluation();
                    } else {
                        addMessage('system', 'The request timed out. Please try again later.');
                    }
                } else {
                    addMessage('system', 'There was an error evaluating your prompt. Please try again.');
                }
                
                updateProgress(3);
            } finally {
                loadingOverlay.classList.remove('active');
            }
        }
        
        await attemptEvaluation();
    }

    // Add event listeners for the analysis panel
    const closeAnalysisBtn = document.getElementById('close-analysis');
    if (closeAnalysisBtn) {
        closeAnalysisBtn.addEventListener('click', function() {
            document.getElementById('analysis-panel').classList.add('hidden');
        });
    }
    
    // Add event listener for "Use This Prompt" button
    const useImprovedPromptBtn = document.getElementById('use-improved-prompt');
    if (useImprovedPromptBtn) {
        useImprovedPromptBtn.addEventListener('click', function() {
            const improvedPrompt = document.getElementById('improved-prompt-text').textContent;
            const promptInput = document.getElementById('prompt-input');
            promptInput.value = improvedPrompt;
            
            // Hide the analysis panel
            document.getElementById('analysis-panel').classList.add('hidden');
            
            // Focus on the prompt input
            promptInput.focus();
        });
    }
}); 