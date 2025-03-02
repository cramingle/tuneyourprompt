document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const progressFill = document.getElementById('progress-fill');
    const stepIndicator1 = document.getElementById('step-indicator-1');
    const stepIndicator2 = document.getElementById('step-indicator-2');
    const stepIndicator3 = document.getElementById('step-indicator-3');
    const stepIndicator4 = document.getElementById('step-indicator-4');
    const stepIndicator5 = document.getElementById('step-indicator-5');
    
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
    const loadingMessage = document.querySelector('.loading-overlay p');
    
    const analysisPanel = document.getElementById('analysis-panel');
    const finalResultPanel = document.getElementById('final-result-panel');
    
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
        progressFill.style.width = `${(step / 5) * 100}%`;
        
        // Update step indicators
        stepIndicator1.className = step >= 1 ? 'step active' : 'step';
        stepIndicator2.className = step >= 2 ? 'step active' : 'step';
        stepIndicator3.className = step >= 3 ? 'step active' : 'step';
        stepIndicator4.className = step >= 4 ? 'step active' : 'step';
        stepIndicator5.className = step >= 5 ? 'step active' : 'step';
        
        if (step > 1) {
            stepIndicator1.className = 'step completed';
        }
        if (step > 2) {
            stepIndicator2.className = 'step completed';
        }
        if (step > 3) {
            stepIndicator3.className = 'step completed';
        }
        if (step > 4) {
            stepIndicator4.className = 'step completed';
        }
        
        // Show/hide input areas with smooth transitions
        if (step === 1) {
            goalInputArea.className = 'input-area';
            promptInputArea.className = 'input-area hidden';
            tryAgainArea.className = 'input-area hidden';
            // Hide panels
            analysisPanel.classList.add('hidden');
            finalResultPanel.classList.add('hidden');
        } else if (step === 2) {
            goalInputArea.className = 'input-area hidden';
            promptInputArea.className = 'input-area';
            tryAgainArea.className = 'input-area hidden';
            // Hide panels
            analysisPanel.classList.add('hidden');
            finalResultPanel.classList.add('hidden');
        } else if (step === 3) {
            goalInputArea.className = 'input-area hidden';
            promptInputArea.className = 'input-area hidden';
            tryAgainArea.className = 'input-area';
            // Hide both panels in Result step - only show chat messages
            analysisPanel.classList.add('hidden');
            finalResultPanel.classList.add('hidden');
        } else if (step === 4) {
            goalInputArea.className = 'input-area hidden';
            promptInputArea.className = 'input-area hidden';
            tryAgainArea.className = 'input-area hidden';
            // Show analysis panel
            analysisPanel.classList.remove('hidden');
            finalResultPanel.classList.add('hidden');
        } else if (step === 5) {
            goalInputArea.className = 'input-area hidden';
            promptInputArea.className = 'input-area hidden';
            tryAgainArea.className = 'input-area';
            // Always keep final result panel hidden, we're using chat separator instead
            analysisPanel.classList.add('hidden');
            finalResultPanel.classList.add('hidden');
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
        loadingMessage.textContent = 'GENERATING RESULT...';
        
        // Track retries
        let retries = 0;
        const maxRetries = 2;
        
        async function attemptEvaluation() {
            try {
                // Update loading message
                if (retries > 0) {
                    loadingMessage.textContent = `RETRY ATTEMPT ${retries}/${maxRetries}...`;
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
                    const errorMessage = errorData.message || errorData.error || `Server responded with status: ${response.status}`;
                    console.error('Error response data:', errorData);
                    
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                
                // Hide loading overlay
                loadingOverlay.style.display = 'none';
                
                // Add AI response message with typing animation
                if (data.aiResponse) {
                    console.log('AI Response received:', data.aiResponse.substring(0, 100) + '...');
                    addMessage('ai', data.aiResponse, '', true);
                } else {
                    console.log('No AI response received from server');
                    addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> No response received from the AI. Please try again.', '', false);
                    return; // Exit early if no response
                }
                
                // Store the analysis data for later use
                window.currentAnalysisData = {
                    matchScore: data.matchPercentage || 0,
                    clarityScore: data.qualityAnalysis?.clarity?.score || 0,
                    detailScore: data.qualityAnalysis?.detail?.score || 0,
                    relevanceScore: data.qualityAnalysis?.relevance?.score || 0,
                    clarityFeedback: data.qualityAnalysis?.clarity?.feedback || 'Consider adding more clarity to your prompt.',
                    detailFeedback: data.qualityAnalysis?.detail?.feedback || 'Add more specific details to your prompt.',
                    relevanceFeedback: data.qualityAnalysis?.relevance?.feedback || 'Make sure your prompt aligns with your goal.',
                    improvedPrompt: data.improvedPrompt || 'Please provide a more specific prompt with clear instructions and details.',
                    textSimilarity: data.textSimilarity || 0,
                    originalPrompt: promptText
                };
                
                // Log the raw data from the server for debugging
                console.log('Raw server response:', {
                    matchPercentage: data.matchPercentage,
                    textSimilarity: data.textSimilarity,
                    qualityAnalysis: data.qualityAnalysis,
                    improvedPrompt: data.improvedPrompt
                });
                
                // Log the analysis data for debugging
                console.log('Analysis data:', window.currentAnalysisData);
                
                // Move to step 3 (Result)
                updateProgress(3);
                
                // Clear the try-again-area and add the analyze button
                const tryAgainArea = document.getElementById('try-again-area');
                tryAgainArea.innerHTML = '';
                
                const buttonRow = document.createElement('div');
                buttonRow.className = 'button-row';
                
                // Create analyze button
                const analyzeBtn = document.createElement('button');
                analyzeBtn.className = 'analyze-button';
                analyzeBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
                analyzeBtn.title = 'Analyze This Prompt';
                analyzeBtn.id = 'analyze-prompt-btn';
                analyzeBtn.addEventListener('click', () => {
                    // Update analysis panel with the data
                    updateAnalysisPanel(window.currentAnalysisData);
                    
                    // Show analysis panel
                    analysisPanel.classList.remove('hidden');
                    
                    // Move to step 4 (Analyze)
                    updateProgress(4);
                });
                
                // Create Try Again button
                const tryAgainBtn = document.createElement('button');
                tryAgainBtn.className = 'try-again-button';
                tryAgainBtn.innerHTML = '<i class="fas fa-redo"></i>';
                tryAgainBtn.title = 'Try Again';
                tryAgainBtn.addEventListener('click', () => {
                    // Clear the prompt input
                    promptInput.value = '';
                    
                    // Add system message
                    addMessage('system', '<i class="fas fa-redo fa-xs"></i> Let\'s try another prompt for the same goal.');
                    
                    // Hide panels if they're open
                    analysisPanel.classList.add('hidden');
                    finalResultPanel.classList.add('hidden');
                    
                    // Move back to step 2
                    updateProgress(2);
                    
                    // Focus on prompt input
                    promptInput.focus();
                });
                
                // Create Start Over button
                const startOverBtn = document.createElement('button');
                startOverBtn.className = 'start-over-button';
                startOverBtn.innerHTML = '<i class="fas fa-sync"></i>';
                startOverBtn.title = 'Start Over';
                startOverBtn.addEventListener('click', () => {
                    // Confirm before starting over
                    if (confirm('Are you sure you want to start over with a new goal?')) {
                        // Clear inputs
                        goalInput.value = '';
                        promptInput.value = '';
                        
                        // Hide panels if they're open
                        analysisPanel.classList.add('hidden');
                        finalResultPanel.classList.add('hidden');
                        
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
                
                // Create a left side container for try again and start over buttons
                const leftButtonsContainer = document.createElement('div');
                leftButtonsContainer.className = 'left-buttons';
                leftButtonsContainer.appendChild(tryAgainBtn);
                leftButtonsContainer.appendChild(startOverBtn);
                
                // Add the left buttons container to the button row
                buttonRow.appendChild(leftButtonsContainer);
                
                // Create a right side container for the analyze button
                const rightButtonsContainer = document.createElement('div');
                rightButtonsContainer.className = 'right-buttons';
                rightButtonsContainer.appendChild(analyzeBtn);
                
                // Add the right buttons container to the button row
                buttonRow.appendChild(rightButtonsContainer);
                
                // Add the button row to the try-again-area
                tryAgainArea.appendChild(buttonRow);
                
            } catch (error) {
                console.error('Error:', error);
                
                // Check if it's a timeout error
                if (error.name === 'AbortError') {
                    console.log('Request timed out');
                    
                    if (retries < maxRetries) {
                        retries++;
                        console.log(`Retry attempt ${retries}/${maxRetries} after timeout`);
                        
                        // Update loading message
                        loadingMessage.textContent = `RETRY ATTEMPT ${retries}/${maxRetries}...`;
                        
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
                    loadingMessage.textContent = `RETRY ATTEMPT ${retries}/${maxRetries}...`;
                    
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
                    console.log('AI API is not available:', data);
                    addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> Note: AI API is not available. Please try again later.');
                }
            } else {
                console.warn('Server health check failed with status:', response.status);
                ollamaAvailable = false;
                addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> Warning: Server health check failed. Please try again later.');
            }
        } catch (error) {
            console.error('Server connection error:', error);
            ollamaAvailable = false;
            if (error.name === 'AbortError') {
                addMessage('system', '<i class="fas fa-clock fa-xs"></i> Warning: Server health check timed out. Please try again later.');
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

    // Function to handle tab switching in analysis panel
    function setupAnalysisTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanes = document.querySelectorAll('.tab-pane');
        
        // Set the first tab as active by default
        if (tabButtons.length > 0 && tabPanes.length > 0) {
            tabButtons[0].classList.add('active');
            tabPanes[0].classList.add('active');
        }
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and panes
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                
                // Add active class to clicked button
                button.classList.add('active');
                
                // Find and show the corresponding tab pane
                const targetId = button.getAttribute('data-tab');
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    }

    // Function to update the analysis panel with the analysis results
    function updateAnalysisPanel(data) {
        // Set up match score
        const matchValue = document.querySelector('.match-value');
        const matchBarFill = document.querySelector('.match-bar-fill');
        
        if (matchValue && matchBarFill) {
            const matchScore = data.matchScore || 75; // Default to 75% if not provided
            matchValue.textContent = `${matchScore}%`;
            matchBarFill.style.width = `${matchScore}%`;
            
            // Add text similarity info if available
            if (data.textSimilarity) {
                const matchInfo = document.querySelector('.match-info');
                if (matchInfo) {
                    const textSimilaritySpan = document.createElement('span');
                    textSimilaritySpan.className = 'text-similarity-info';
                    textSimilaritySpan.textContent = `(Content similarity: ${data.textSimilarity}%)`;
                    textSimilaritySpan.style.fontSize = '0.8rem';
                    textSimilaritySpan.style.color = 'var(--light-text)';
                    textSimilaritySpan.style.marginLeft = '8px';
                    
                    // Remove any existing text similarity info
                    const existingInfo = matchInfo.querySelector('.text-similarity-info');
                    if (existingInfo) {
                        existingInfo.remove();
                    }
                    
                    matchInfo.appendChild(textSimilaritySpan);
                }
            }
        }
        
        // Set up metrics (clarity, detail, relevance)
        const metrics = [
            { name: 'clarity', score: data.clarityScore || 80, feedback: data.clarityFeedback || 'Consider adding more clarity to your prompt.' },
            { name: 'detail', score: data.detailScore || 70, feedback: data.detailFeedback || 'Add more specific details to improve your prompt.' },
            { name: 'relevance', score: data.relevanceScore || 85, feedback: data.relevanceFeedback || 'Make sure your prompt aligns with your goal.' }
        ];
        
        metrics.forEach(metric => {
            const barFill = document.getElementById(`${metric.name}-bar`);
            const score = document.getElementById(`${metric.name}-score`);
            const feedback = document.getElementById(`${metric.name}-feedback`);
            
            if (barFill && score) {
                barFill.style.width = `${metric.score}%`;
                score.textContent = `${metric.score}%`;
            }
            
            if (feedback && metric.feedback) {
                feedback.textContent = metric.feedback;
            }
        });
        
        // Set up improved prompt
        const improvedPromptText = document.getElementById('improved-prompt-text');
        if (improvedPromptText) {
            if (data.improvedPrompt && data.improvedPrompt.trim() !== '-' && data.improvedPrompt.trim() !== '') {
                console.log('Setting improved prompt text to:', data.improvedPrompt);
                improvedPromptText.textContent = data.improvedPrompt;
                
                // Add original prompt for comparison if available
                if (data.originalPrompt) {
                    const improvedPromptSection = document.querySelector('.improved-prompt-section');
                    if (improvedPromptSection) {
                        // Check if original prompt comparison already exists
                        let originalPromptDiv = improvedPromptSection.querySelector('.original-prompt-comparison');
                        
                        if (!originalPromptDiv) {
                            originalPromptDiv = document.createElement('div');
                            originalPromptDiv.className = 'original-prompt-comparison';
                            originalPromptDiv.style.marginTop = '10px';
                            originalPromptDiv.style.padding = '10px';
                            originalPromptDiv.style.borderRadius = '4px';
                            originalPromptDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                            originalPromptDiv.style.fontSize = '0.9rem';
                            
                            const originalPromptLabel = document.createElement('div');
                            originalPromptLabel.style.fontWeight = 'bold';
                            originalPromptLabel.style.marginBottom = '5px';
                            originalPromptLabel.textContent = 'Original Prompt:';
                            
                            const originalPromptContent = document.createElement('div');
                            originalPromptContent.textContent = data.originalPrompt;
                            
                            originalPromptDiv.appendChild(originalPromptLabel);
                            originalPromptDiv.appendChild(originalPromptContent);
                            
                            improvedPromptSection.appendChild(originalPromptDiv);
                        } else {
                            // Update existing original prompt comparison
                            const originalPromptContent = originalPromptDiv.querySelector('div:nth-child(2)');
                            if (originalPromptContent) {
                                originalPromptContent.textContent = data.originalPrompt;
                            }
                        }
                    }
                }
            } else {
                console.log('No valid improved prompt found, using default');
                improvedPromptText.textContent = 'Please provide a more specific prompt with clear instructions and details.';
            }
        } else {
            console.log('Could not find improved-prompt-text element');
        }
        
        // Initialize tabs
        setupAnalysisTabs();
    }

    // Add event listeners for the analysis panel
    const closeAnalysisBtn = document.getElementById('close-analysis');
    if (closeAnalysisBtn) {
        closeAnalysisBtn.addEventListener('click', function() {
            analysisPanel.classList.add('hidden');
            
            // If we're on step 4 (Analyze), go back to step 3 (Result)
            if (currentStep === 4) {
                updateProgress(3);
            }
        });
    }
    
    // Add event listener for the close button in the Final Result section
    const closeFinalResultBtn = document.getElementById('close-final-result');
    if (closeFinalResultBtn) {
        closeFinalResultBtn.addEventListener('click', function() {
            finalResultPanel.classList.add('hidden');
        });
    }
    
    // Add event listener for "Use This Prompt" button
    const useImprovedPromptBtn = document.getElementById('use-improved-prompt');
    if (useImprovedPromptBtn) {
        useImprovedPromptBtn.addEventListener('click', async () => {
            try {
                const improvedPrompt = window.currentAnalysisData?.improvedPrompt || 
                    document.getElementById('improved-prompt-text').innerText;
                const goalText = document.getElementById('goal-input').value.trim();
                
                if (!improvedPrompt) return;
                
                console.log('Using improved prompt:', improvedPrompt);
                
                // Hide the analysis panel
                analysisPanel.classList.add('hidden');
                
                // Add a message indicating we're using the improved prompt
                addMessage('system', '<i class="fas fa-magic fa-xs"></i> Using the improved prompt to generate a better response...');
                
                // Show loading overlay
                loadingOverlay.style.display = 'flex';
                loadingMessage.textContent = 'GENERATING RESPONSE...';
                
                console.log('Sending request to /api/generate with prompt:', improvedPrompt.substring(0, 100) + '...');
                
                const response = await fetch('/api/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: improvedPrompt,
                        goal: goalText
                    })
                });
                
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.message || errorData.error || `Server responded with status: ${response.status}`;
                    console.error('Error response data:', errorData);
                    
                    // If we get a 404, try to use the original prompt evaluation endpoint as a fallback
                    if (response.status === 404) {
                        console.log('Trying fallback to /api/evaluate endpoint');
                        
                        const fallbackResponse = await fetch('/api/evaluate', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                prompt: improvedPrompt,
                                goal: goalText
                            })
                        });
                        
                        if (fallbackResponse.ok) {
                            const fallbackData = await fallbackResponse.json();
                            if (fallbackData.aiResponse) {
                                console.log('Successfully used fallback endpoint');
                                
                                // Hide loading overlay
                                loadingOverlay.style.display = 'none';
                                
                                // Add a separator line in the chat
                                const separator = document.createElement('div');
                                separator.className = 'chat-separator';
                                separator.innerHTML = '<span>Final Result</span>';
                                chatMessages.appendChild(separator);
                                
                                // Add the final AI response to chat
                                addMessage('ai', fallbackData.aiResponse);
                                
                                // Update progress to step 5 (Final)
                                updateProgress(5);
                                
                                // Add Try Again and Start Over buttons
                                addFinalStepButtons();
                                
                                return;
                            }
                        }
                    }
                    
                    throw new Error(errorMessage);
                }
                
                const data = await response.json();
                
                if (!data.response) {
                    throw new Error('No response received from the AI');
                }
                
                // Add a separator line in the chat
                const separator = document.createElement('div');
                separator.className = 'chat-separator';
                separator.innerHTML = '<span>Final Result</span>';
                chatMessages.appendChild(separator);
                
                // Add the final AI response to chat
                addMessage('ai', data.response);
                
                // Update progress to step 5 (Final)
                updateProgress(5);
                
                // Add Try Again and Start Over buttons to the try-again-area
                const tryAgainArea = document.getElementById('try-again-area');
                tryAgainArea.innerHTML = '';
                
                const buttonRow = document.createElement('div');
                buttonRow.className = 'button-row';
                
                // Create Try Again button
                const tryAgainBtn = document.createElement('button');
                tryAgainBtn.className = 'try-again-button';
                tryAgainBtn.innerHTML = '<i class="fas fa-redo"></i>';
                tryAgainBtn.title = 'Try Again';
                tryAgainBtn.addEventListener('click', () => {
                    // Clear the prompt input
                    promptInput.value = '';
                    
                    // Add system message
                    addMessage('system', '<i class="fas fa-redo fa-xs"></i> Let\'s try another prompt for the same goal.');
                    
                    // Hide panels if they're open
                    analysisPanel.classList.add('hidden');
                    finalResultPanel.classList.add('hidden');
                    
                    // Move back to step 2
                    updateProgress(2);
                    
                    // Focus on prompt input
                    promptInput.focus();
                });
                
                // Create Start Over button
                const startOverBtn = document.createElement('button');
                startOverBtn.className = 'start-over-button';
                startOverBtn.innerHTML = '<i class="fas fa-sync"></i>';
                startOverBtn.title = 'Start Over';
                startOverBtn.addEventListener('click', () => {
                    // Confirm before starting over
                    if (confirm('Are you sure you want to start over with a new goal?')) {
                        // Clear inputs
                        goalInput.value = '';
                        promptInput.value = '';
                        
                        // Hide panels if they're open
                        analysisPanel.classList.add('hidden');
                        finalResultPanel.classList.add('hidden');
                        
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
                
                // Create a left side container for try again and start over buttons
                const leftButtonsContainer = document.createElement('div');
                leftButtonsContainer.className = 'left-buttons';
                leftButtonsContainer.appendChild(tryAgainBtn);
                leftButtonsContainer.appendChild(startOverBtn);
                
                // Add the left buttons container to the button row
                buttonRow.appendChild(leftButtonsContainer);
                
                // We don't need the right buttons container here since we're in the final step
                tryAgainArea.appendChild(buttonRow);
                
            } catch (error) {
                console.error('Error generating response:', error);
                addMessage('system', `<i class="fas fa-exclamation-triangle fa-xs"></i> ${error.message || 'Failed to generate response. Please try again.'}`);
            } finally {
                loadingOverlay.style.display = 'none';
            }
        });
    }

    // Add CSS for the chat separator
    const style = document.createElement('style');
    style.textContent = `
    .chat-separator {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 20px 0;
    }

    .chat-separator::before,
    .chat-separator::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--border-color);
    }

    .chat-separator span {
        padding: 0 10px;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--light-text);
        font-weight: 600;
        background-color: var(--background-color);
    }
    `;
    document.head.appendChild(style);

    // Function to add system messages to the chat
    function addSystemMessage(text) {
        const systemMessage = document.createElement('div');
        systemMessage.className = 'message system';
        systemMessage.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;
        chatMessages.appendChild(systemMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}); 