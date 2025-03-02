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
            // Show final result panel
            analysisPanel.classList.add('hidden');
            finalResultPanel.classList.remove('hidden');
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
                    throw new Error(errorData.error || `Server responded with status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Hide loading overlay
                loadingOverlay.style.display = 'none';
                
                // Add AI response message with typing animation
                if (data.aiResponse) {
                    addMessage('ai', data.aiResponse, '', true);
                } else {
                    addMessage('ai', 'Sorry, I couldn\'t generate a response. Please try again.', '', true);
                }
                
                // Store the analysis data for later use
                window.currentAnalysisData = data.analysis;
                
                // Move to step 3 (Result)
                updateProgress(3);
                
                // Add analyze button to the try-again-area
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
                
                // Clear the try-again-area and add the analyze button
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
                
                // Create a right side container for the analyze button
                const rightButtonsContainer = document.createElement('div');
                rightButtonsContainer.className = 'right-buttons';
                rightButtonsContainer.appendChild(analyzeBtn);
                
                // Add both containers to the button row
                buttonRow.appendChild(leftButtonsContainer);
                buttonRow.appendChild(rightButtonsContainer);
                
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
        }
        
        // Set up metrics (clarity, detail, relevance)
        const metrics = [
            { name: 'clarity', score: data.clarityScore || 80 },
            { name: 'detail', score: data.detailScore || 70 },
            { name: 'relevance', score: data.relevanceScore || 85 }
        ];
        
        metrics.forEach(metric => {
            const barFill = document.querySelector(`.${metric.name}-bar-fill`);
            const score = document.querySelector(`.${metric.name}-score`);
            
            if (barFill && score) {
                barFill.style.width = `${metric.score}%`;
                score.textContent = `${metric.score}%`;
            }
        });
        
        // Set up improved prompt
        const improvedPromptText = document.querySelector('.improved-prompt-text');
        if (improvedPromptText && data.improvedPrompt) {
            improvedPromptText.textContent = data.improvedPrompt;
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
        useImprovedPromptBtn.addEventListener('click', async function() {
            const improvedPrompt = document.getElementById('improved-prompt-text').textContent;
            const goalText = document.getElementById('goal-input').value.trim();
            const promptInput = document.getElementById('prompt-input');
            
            // Update the prompt input with the improved prompt
            promptInput.value = improvedPrompt;
            
            // Show loading overlay
            loadingOverlay.style.display = 'flex';
            loadingMessage.textContent = 'GENERATING FINAL RESULT...';
            
            try {
                // Set a timeout for the request
                const controller = new AbortController();
                const timeoutDuration = 30000; // 30 seconds
                const timeoutId = setTimeout(() => {
                    console.log(`API request timed out after ${timeoutDuration/1000} seconds`);
                    controller.abort();
                }, timeoutDuration);
                
                // Call the API with the improved prompt but skip analysis
                const response = await fetch('/api/evaluate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: improvedPrompt,
                        goal: goalText,
                        skipAnalysis: true // Add this flag to indicate we just want the response
                    }),
                    signal: controller.signal
                });
                
                // Clear the timeout
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`API responded with status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Hide loading overlay
                loadingOverlay.style.display = 'none';
                
                // Show the final result panel
                const finalResultText = document.getElementById('final-result-text');
                finalResultText.textContent = data.aiResponse;
                finalResultPanel.classList.remove('hidden');
                
                // Add the AI response to the chat as well
                addMessage('ai', data.aiResponse, '', true);
                
                // Close the analysis panel
                analysisPanel.classList.add('hidden');
                
                // Move to step 5 (Final Result)
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
                
                // Create a right side container for the analyze button
                const rightButtonsContainer = document.createElement('div');
                rightButtonsContainer.className = 'right-buttons';
                rightButtonsContainer.appendChild(analyzeBtn);
                
                // Add both containers to the button row
                buttonRow.appendChild(leftButtonsContainer);
                buttonRow.appendChild(rightButtonsContainer);
                
                tryAgainArea.appendChild(buttonRow);
                
            } catch (error) {
                console.error('Error getting final result:', error);
                
                // Hide loading overlay
                loadingOverlay.style.display = 'none';
                
                // Show error message
                addMessage('system', `<i class="fas fa-exclamation-triangle fa-xs"></i> Error getting final result: ${error.message}. Please try again.`);
            }
        });
    }

    // Add event listener for the "Use Improved Prompt" button
    document.querySelector('.use-improved-prompt').addEventListener('click', async () => {
        const improvedPromptText = document.querySelector('.improved-prompt-text').textContent;
        if (!improvedPromptText) return;
        
        // Hide the analysis panel
        analysisPanel.classList.add('hidden');
        
        // Add a message indicating we're using the improved prompt
        addMessage('system', 'Using the improved prompt to generate a better response...');
        
        // Show loading state
        loadingOverlay.classList.add('active');
        loadingMessage.textContent = 'Generating response with improved prompt...';
        
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: improvedPromptText })
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate response');
            }
            
            const data = await response.json();
            
            // Add a separator line in the chat
            const separator = document.createElement('div');
            separator.className = 'chat-separator';
            separator.innerHTML = '<span>Final Result</span>';
            chatMessages.appendChild(separator);
            
            // Add the final AI response to chat
            addMessage('ai', data.response);
            
            // Update progress
            updateProgress(5);
        } catch (error) {
            console.error('Error generating response:', error);
            addMessage('system', 'Failed to generate response. Please try again.');
        } finally {
            loadingOverlay.classList.remove('active');
        }
    });

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

    // Update the analyzeBtn event listener
    document.getElementById('analyze-btn').addEventListener('click', async () => {
        const promptText = promptInput.value.trim();
        if (!promptText) return;
        
        // Show loading state
        const analyzeBtn = document.getElementById('analyze-btn');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const response = await fetch('/api/analyze-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: promptText })
            });
            
            if (!response.ok) {
                throw new Error('Failed to analyze prompt');
            }
            
            const data = await response.json();
            
            // Update the analysis panel with the results
            updateAnalysisPanel(data);
            
            // Show the analysis panel and update progress
            analysisPanel.classList.remove('hidden');
            updateProgress(4);
        } catch (error) {
            console.error('Error analyzing prompt:', error);
            addSystemMessage('Failed to analyze prompt. Please try again.');
        } finally {
            // Reset button state
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
        }
    });

    // Function to add system messages to the chat
    function addSystemMessage(text) {
        const systemMessage = document.createElement('div');
        systemMessage.className = 'chat-message system-message';
        systemMessage.innerHTML = `
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;
        chatMessages.appendChild(systemMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}); 