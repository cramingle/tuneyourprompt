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
    const loadingMessage = document.getElementById('loading-message');
    const loadingTip = document.getElementById('loading-tip');
    
    const analysisPanel = document.getElementById('analysis-panel');
    const finalResultPanel = document.getElementById('final-result-panel');
    
    // Current step tracking
    let currentStep = 1;
    let ollamaAvailable = false;
    
    // Loading tips array
    const loadingTips = [
        "Effective prompts are clear, specific, and provide context for the AI to understand your needs.",
        "Consider including examples in your prompt to guide the AI's response format.",
        "Breaking down complex requests into smaller, more manageable parts often yields better results.",
        "Specify your audience and desired tone to get more appropriate responses.",
        "Adding constraints to your prompt can help focus the AI's response.",
        "Be explicit about what you don't want to see in the response.",
        "Providing background information helps the AI understand the context of your request.",
        "The more specific your prompt, the more tailored the response will be.",
        "Consider using a step-by-step approach for complex tasks.",
        "Experiment with different phrasings to find what works best for your needs."
    ];
    
    // Function to show loading overlay with custom message
    function showLoadingOverlay(message) {
        // Set the loading message
        loadingMessage.textContent = message.toUpperCase();
        
        // Show a random tip
        const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
        loadingTip.textContent = randomTip;
        
        // Display the overlay
        loadingOverlay.style.display = 'flex';
        
        // Start rotating tips every 8 seconds
        startRotatingTips();
    }
    
    // Function to rotate loading tips
    let tipRotationInterval;
    function startRotatingTips() {
        clearInterval(tipRotationInterval);
        tipRotationInterval = setInterval(() => {
            const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
            
            // Fade out current tip
            loadingTip.style.opacity = 0;
            
            // After fade out, change text and fade in
            setTimeout(() => {
                loadingTip.textContent = randomTip;
                loadingTip.style.opacity = 1;
            }, 500);
        }, 8000);
    }
    
    // Function to hide loading overlay and clear tip rotation
    function hideLoadingOverlay() {
        loadingOverlay.style.display = 'none';
        clearInterval(tipRotationInterval);
    }
    
    // Helper function to create Feather icon HTML
    function createFeatherIcon(name, size = 'sm') {
        return `<i data-feather="${name}" class="feather-${size}" stroke="currentColor" fill="none"></i>`;
    }
    
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
    
    // Add typing animation with formatted paragraphs
    function typeTextFormatted(container, text, speed = 30) {
        // Clear the container
        container.innerHTML = '';
        
        // Format the text into paragraphs
        const formattedContent = formatAIResponse(text);
        container.innerHTML = formattedContent;
        
        // Get all text nodes in the container
        const textNodes = [];
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        // Hide all text initially
        textNodes.forEach(node => {
            node.originalText = node.nodeValue;
            node.nodeValue = '';
        });
        
        return new Promise(resolve => {
            let currentNodeIndex = 0;
            let currentCharIndex = 0;
            
            function typeNextChar() {
                if (currentNodeIndex >= textNodes.length) {
                    resolve();
                    return;
                }
                
                const currentNode = textNodes[currentNodeIndex];
                const originalText = currentNode.originalText;
                
                if (currentCharIndex < originalText.length) {
                    currentNode.nodeValue = originalText.substring(0, currentCharIndex + 1);
                    currentCharIndex++;
                    setTimeout(typeNextChar, speed);
                } else {
                    currentNodeIndex++;
                    currentCharIndex = 0;
                    setTimeout(typeNextChar, speed * 2); // Slight pause between nodes
                }
            }
            
            typeNextChar();
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
                // For animated AI responses, use the formatted typing animation
                messageDiv.appendChild(contentDiv);
                chatMessages.appendChild(messageDiv);
                
                // Scroll to the bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
                
                // Start typing animation with formatting
                return typeTextFormatted(contentDiv, content, 15).then(() => {
                    // Scroll to bottom again after animation completes
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    // Initialize any Feather icons in the content
                    feather.replace();
                    return messageDiv;
                });
            } else if (type === 'ai') {
                // Format AI responses with proper paragraphs
                const formattedContent = formatAIResponse(content);
                contentDiv.innerHTML = formattedContent;
                messageDiv.appendChild(contentDiv);
                chatMessages.appendChild(messageDiv);
                // Initialize any Feather icons in the content
                feather.replace();
            } else {
                contentDiv.innerHTML = `<p>${content}</p>`;
                messageDiv.appendChild(contentDiv);
                chatMessages.appendChild(messageDiv);
                // Initialize any Feather icons in the content
                feather.replace();
            }
        } else {
            contentDiv.appendChild(content);
            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
            // Initialize any Feather icons in the content
            feather.replace();
        }
        
        // Scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageDiv;
    }
    
    // Helper function to format AI responses with proper paragraphs
    function formatAIResponse(text) {
        if (!text) return '<p>No response</p>';
        
        // Replace code blocks
        text = text.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, function(match, language, code) {
            return `<pre><code class="language-${language}">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
        });
        
        // Replace inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Split by double newlines or numbered/bullet list items
        let paragraphs = text.split(/\n\s*\n|\n(?=\d+\.|\*\s|•\s|-\s)/);
        
        // Handle single newlines within paragraphs
        paragraphs = paragraphs.map(p => p.replace(/\n(?!\d+\.|\*\s|•\s|-\s)/g, '<br>'));
        
        // Process paragraphs
        paragraphs = paragraphs.map(p => {
            // Skip pre-formatted code blocks
            if (p.includes('<pre>')) return p;
            
            // Check if this paragraph contains a numbered list
            if (/^\d+\.\s/.test(p)) {
                // Split by newline followed by a number and period
                const listItems = p.split(/\n(?=\d+\.\s)/);
                
                // If we have multiple list items, format as a list
                if (listItems.length > 1) {
                    return `<ol>${listItems.map(item => `<li>${item.replace(/^\d+\.\s/, '')}</li>`).join('')}</ol>`;
                }
            }
            
            // Check if this paragraph contains a bullet list
            if (/^(\*\s|•\s|-\s)/.test(p)) {
                // Split by newline followed by a bullet
                const listItems = p.split(/\n(?=\*\s|•\s|-\s)/);
                
                // If we have multiple list items, format as a list
                if (listItems.length > 1) {
                    return `<ul>${listItems.map(item => `<li>${item.replace(/^(\*\s|•\s|-\s)/, '')}</li>`).join('')}</ul>`;
                }
            }
            
            // Check for headings (# Heading)
            if (/^#{1,6}\s/.test(p)) {
                const level = p.match(/^(#{1,6})\s/)[1].length;
                const content = p.replace(/^#{1,6}\s/, '');
                return `<h${level}>${content}</h${level}>`;
            }
            
            return `<p>${p}</p>`;
        });
        
        return paragraphs.join('');
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
        if (goalText) {
            // Track goal submission
            trackEvent('goal_submitted', { length: goalText.length });
            
            // Add user message
            addMessage('user', goalText);
            
            // Add system message
            addSystemMessage('Great! Now write a prompt that you think will achieve this goal.');
            
            // Hide goal input, show prompt input
            goalInputArea.classList.add('hidden');
            promptInputArea.classList.remove('hidden');
            
            // Focus on prompt input
            promptInput.focus();
            
            // Move to step 2 (Write)
            updateProgress(2);
        }
    });
    
    promptNextBtn.addEventListener('click', async () => {
        const promptText = promptInput.value.trim();
        
        if (promptText) {
            // Track prompt submission
            trackEvent('prompt_submitted', { length: promptText.length });
            
            // Add user message
            addMessage('user', promptText);
            
            // Show loading overlay
            showLoadingOverlay('ANALYZING PROMPT');
            
            // Get the goal text
            const goalText = goalInput.value.trim();
            
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
                    
                    // Hide loading overlay
                    hideLoadingOverlay();
                    
                    // Add AI response message with typing animation
                    if (data.aiResponse) {
                        console.log('AI Response received:', data.aiResponse.substring(0, 100) + '...');
                        addMessage('ai', data.aiResponse, '', true);
                    } else {
                        console.log('No AI response received from server');
                        addMessage('system', `${createFeatherIcon('alert-triangle')} No response received from the AI. Please try again.`);
                        return; // Exit early if no response
                    }
                    
                    // Store the analysis data for later use
                    window.currentAnalysisData = {
                        matchScore: data.matchPercentage || 0,
                        clarityScore: data.analysis?.clarity?.score || 0,
                        detailScore: data.analysis?.detail?.score || 0,
                        relevanceScore: data.analysis?.relevance?.score || 0,
                        clarityFeedback: data.analysis?.clarity?.feedback || 'Consider adding more clarity to your prompt.',
                        detailFeedback: data.analysis?.detail?.feedback || 'Add more specific details to your prompt.',
                        relevanceFeedback: data.analysis?.relevance?.feedback || 'Make sure your prompt aligns with your goal.',
                        improvedPrompt: data.analysis?.improvedPrompt || 'Please provide a more specific prompt with clear instructions and details.',
                        textSimilarity: data.textSimilarity || 0,
                        originalPrompt: promptText
                    };
                    
                    // Log the raw data from the server for debugging
                    console.log('Raw server response:', {
                        matchPercentage: data.matchPercentage,
                        textSimilarity: data.textSimilarity,
                        analysis: data.analysis,
                        improvedPrompt: data.analysis?.improvedPrompt
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
                    analyzeBtn.innerHTML = `${createFeatherIcon('bar-chart-2')} Analyze`;
                    analyzeBtn.title = 'Analyze This Prompt';
                    analyzeBtn.id = 'analyze-prompt-btn';
                    analyzeBtn.addEventListener('click', () => {
                        // Track analyze button click
                        trackEvent('analyze_button_clicked', {
                            matchPercentage: window.currentAnalysisData.matchPercentage
                        });
                        
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
                    tryAgainBtn.innerHTML = `${createFeatherIcon('refresh-cw')} Try Again`;
                    tryAgainBtn.title = 'Try Again';
                    tryAgainBtn.addEventListener('click', () => {
                        // Clear the prompt input
                        promptInput.value = '';
                        
                        // Add system message
                        addMessage('system', createFeatherIcon('refresh-cw') + ' Let\'s try another prompt for the same goal.');
                        
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
                    startOverBtn.innerHTML = `${createFeatherIcon('rotate-ccw')} Start Over`;
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
                            addMessage('system', createFeatherIcon('rotate-ccw') + ' Let\'s start over with a new goal.');
                            
                            // Move back to step 1
                            updateProgress(1);
                            
                            // Focus on goal input
                            goalInput.focus();
                        }
                    });
                    
                    // Create Continue Chat button
                    const continueChatBtn = document.createElement('button');
                    continueChatBtn.className = 'continue-chat-button';
                    continueChatBtn.innerHTML = `${createFeatherIcon('message-circle')} Continue Chat`;
                    continueChatBtn.title = 'Continue Chat';
                    continueChatBtn.addEventListener('click', () => {
                        // Create a chat input area
                        const chatInputArea = document.createElement('div');
                        chatInputArea.className = 'input-area';
                        chatInputArea.innerHTML = `
                            <div class="input-container">
                                <textarea id="continue-chat-input" placeholder="Continue the conversation..."></textarea>
                                <button class="send-button" id="send-chat-btn" title="Send Message">
                                    <i data-feather="send" class="feather"></i>
                                </button>
                            </div>
                        `;
                        
                        // Replace the button row with the chat input area
                        tryAgainArea.innerHTML = '';
                        tryAgainArea.appendChild(chatInputArea);
                        
                        // Initialize Feather icons in the newly added elements
                        feather.replace();
                        
                        // Focus on the chat input
                        document.getElementById('continue-chat-input').focus();
                        
                        // Add event listener for the send button
                        document.getElementById('send-chat-btn').addEventListener('click', sendContinueChatMessage);
                        
                        // Add event listener for Enter key
                        document.getElementById('continue-chat-input').addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendContinueChatMessage();
                            }
                        });
                        
                        // Add a system message
                        addMessage('system', ' Continue your conversation with the AI');
                    });
                    
                    // Create a left side container for try again and start over buttons
                    const leftButtonsContainer = document.createElement('div');
                    leftButtonsContainer.className = 'left-buttons';
                    leftButtonsContainer.appendChild(tryAgainBtn);
                    leftButtonsContainer.appendChild(startOverBtn);
                    
                    // Add the left buttons container to the button row
                    buttonRow.appendChild(leftButtonsContainer);
                    
                    // Create a right side container for the analyze button and continue chat button
                    const rightButtonsContainer = document.createElement('div');
                    rightButtonsContainer.className = 'right-buttons';
                    rightButtonsContainer.appendChild(analyzeBtn);
                    rightButtonsContainer.appendChild(continueChatBtn);
                    
                    // Add the right buttons container to the button row
                    buttonRow.appendChild(rightButtonsContainer);
                    
                    // Add the button row to the try-again-area
                    tryAgainArea.appendChild(buttonRow);

                    // Initialize Feather icons in the newly added buttons
                    feather.replace();
                    
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
                            hideLoadingOverlay();
                            
                            addMessage('system', createFeatherIcon('clock') + ' The request timed out. The server might be busy. Please try again later.');
                            
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
                        hideLoadingOverlay();
                        
                        addMessage('system', createFeatherIcon('alert-triangle') + ' An error occurred while evaluating your prompt: ' + error.message + '. Please try again later.');
                        
                        // Move to step 3 anyway so user can try again
                        updateProgress(3);
                    }
                }
            }
            
            // Start the evaluation process
            attemptEvaluation();
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
                    console.log('AI API is not available:', data);
                    addMessage('system', createFeatherIcon('alert-triangle') + ' Note: AI API is not available. Please try again later.');
                }
            } else {
                console.warn('Server health check failed with status:', response.status);
                ollamaAvailable = false;
                addMessage('system', createFeatherIcon('alert-triangle') + ' Warning: Server health check failed. Please try again later.');
            }
        } catch (error) {
            console.error('Server connection error:', error);
            ollamaAvailable = false;
            if (error.name === 'AbortError') {
                addMessage('system', createFeatherIcon('clock') + ' Warning: Server health check timed out. Please try again later.');
            } else {
                addMessage('system', createFeatherIcon('alert-triangle') + ' Error: Cannot connect to the server. Please check your connection and reload the page.');
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
            { name: 'clarity', score: data.clarityScore, feedback: data.clarityFeedback || 'Consider adding more clarity to your prompt.' },
            { name: 'detail', score: data.detailScore, feedback: data.detailFeedback || 'Add more specific details to improve your prompt.' },
            { name: 'relevance', score: data.relevanceScore, feedback: data.relevanceFeedback || 'Make sure your prompt aligns with your goal.' }
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
    
    // Function to add Try Again and Start Over buttons for the final step
    function addFinalStepButtons() {
        // Add Try Again and Start Over buttons to the try-again-area
        const tryAgainArea = document.getElementById('try-again-area');
        tryAgainArea.innerHTML = '';
        
        const buttonRow = document.createElement('div');
        buttonRow.className = 'button-row';
        
        // Create Try Again button
        const tryAgainBtn = document.createElement('button');
        tryAgainBtn.className = 'try-again-button';
        tryAgainBtn.innerHTML = `${createFeatherIcon('refresh-cw')} Try Again`;
        tryAgainBtn.title = 'Try Again';
        tryAgainBtn.addEventListener('click', () => {
            // Clear the prompt input
            promptInput.value = '';
            
            // Add system message
            addMessage('system', createFeatherIcon('refresh-cw') + ' Let\'s try another prompt for the same goal.');
            
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
        startOverBtn.innerHTML = `${createFeatherIcon('rotate-ccw')} Start Over`;
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
                addMessage('system', createFeatherIcon('rotate-ccw') + ' Let\'s start over with a new goal.');
                
                // Move back to step 1
                updateProgress(1);
                
                // Focus on goal input
                goalInput.focus();
            }
        });
        
        // Create Continue Chat button
        const continueChatBtn = document.createElement('button');
        continueChatBtn.className = 'continue-chat-button';
        continueChatBtn.innerHTML = `${createFeatherIcon('message-circle')} Continue Chat`;
        continueChatBtn.title = 'Continue Chat';
        continueChatBtn.addEventListener('click', () => {
            // Create a chat input area
            const chatInputArea = document.createElement('div');
            chatInputArea.className = 'input-area';
            chatInputArea.innerHTML = `
                <div class="input-container">
                    <textarea id="continue-chat-input" placeholder="Continue the conversation..."></textarea>
                    <button class="send-button" id="send-chat-btn" title="Send Message">
                        <i data-feather="send" class="feather"></i>
                    </button>
                </div>
            `;
            
            // Replace the button row with the chat input area
            tryAgainArea.innerHTML = '';
            tryAgainArea.appendChild(chatInputArea);
            
            // Initialize Feather icons in the newly added elements
            feather.replace();
            
            // Focus on the chat input
            document.getElementById('continue-chat-input').focus();
            
            // Add event listener for the send button
            document.getElementById('send-chat-btn').addEventListener('click', sendContinueChatMessage);
            
            // Add event listener for Enter key
            document.getElementById('continue-chat-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendContinueChatMessage();
                }
            });
            
            // Add a system message
            addMessage('system', ' Continue your conversation with the AI');
        });
        
        // Create a left side container for try again and start over buttons
        const leftButtonsContainer = document.createElement('div');
        leftButtonsContainer.className = 'left-buttons';
        leftButtonsContainer.appendChild(tryAgainBtn);
        leftButtonsContainer.appendChild(startOverBtn);
        
        // Add the left buttons container to the button row
        buttonRow.appendChild(leftButtonsContainer);
        
        // Create a right side container for the analyze button and continue chat button
        const rightButtonsContainer = document.createElement('div');
        rightButtonsContainer.className = 'right-buttons';
        rightButtonsContainer.appendChild(continueChatBtn);
        
        // Add the right buttons container to the button row
        buttonRow.appendChild(rightButtonsContainer);
        
        // Add the button row to the try-again-area
        tryAgainArea.appendChild(buttonRow);

        // Initialize Feather icons in the newly added buttons
        feather.replace();
    }
    
    // Function to send a continue chat message
    function sendContinueChatMessage() {
        const chatInput = document.getElementById('continue-chat-input');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Add user message to chat
        addMessage('user', message);
        
        // Clear input
        chatInput.value = '';
        
        // Show loading overlay
        showLoadingOverlay('AI is thinking');
        
        // Track retries
        let retries = 0;
        const maxRetries = 2;
        
        // Get the goal and previous context
        const goalText = goalInput.value.trim();
        
        async function attemptContinueChat() {
            try {
                // Update loading message if retrying
                if (retries > 0) {
                    loadingMessage.textContent = `RETRY ATTEMPT ${retries}/${maxRetries}...`;
                }
                
                // Create a context from the previous messages
                const chatHistory = Array.from(chatMessages.querySelectorAll('.message'))
                    .map(msg => {
                        const isAi = msg.classList.contains('ai');
                        const isUser = msg.classList.contains('user');
                        const content = msg.querySelector('.message-content').textContent.trim();
                        
                        if (isAi) return `AI: ${content}`;
                        if (isUser) return `User: ${content}`;
                        return null;
                    })
                    .filter(msg => msg !== null)
                    .slice(-10) // Get last 10 messages for context
                    .join('\n');
                
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
                
                // Hide loading overlay
                hideLoadingOverlay();
                
                // Add the AI response to the chat
                addMessage('ai', data.response, '', true);
                
                // Restore the continue chat input area
                const tryAgainArea = document.getElementById('try-again-area');
                const chatInputArea = document.createElement('div');
                chatInputArea.className = 'input-area';
                chatInputArea.innerHTML = `
                    <div class="input-container">
                        <textarea id="continue-chat-input" placeholder="Continue the conversation..."></textarea>
                        <button class="send-button" id="send-chat-btn" title="Send Message">
                            <i data-feather="send" class="feather"></i>
                        </button>
                    </div>
                `;
                
                tryAgainArea.innerHTML = '';
                tryAgainArea.appendChild(chatInputArea);
                
                // Initialize Feather icons in the newly added elements
                feather.replace();
                
                // Focus on the chat input
                document.getElementById('continue-chat-input').focus();
                
                // Add event listener for the send button
                document.getElementById('send-chat-btn').addEventListener('click', sendContinueChatMessage);
                
                // Add event listener for Enter key
                document.getElementById('continue-chat-input').addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendContinueChatMessage();
                    }
                });
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
                        // Hide loading overlay
                        hideLoadingOverlay();
                        
                        addMessage('system', createFeatherIcon('clock') + ' The request timed out. The server might be busy. Please try again later.');
                        
                        // Restore the buttons
                        addFinalStepButtons();
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
                        // Hide loading overlay
                        hideLoadingOverlay();
                        
                        addMessage('system', createFeatherIcon('alert-triangle') + ' The server encountered an error. Please try again later.');
                        
                        // Restore the buttons
                        addFinalStepButtons();
                    }
                } else {
                    // Other errors
                    // Hide loading overlay
                    hideLoadingOverlay();
                    
                    // Show error message
                    addMessage('system', createFeatherIcon('alert-triangle') + ' Error: ' + error.message);
                    
                    // Restore the buttons
                    addFinalStepButtons();
                }
            }
        }
        
        // Start the continue chat process
        attemptContinueChat();
    }

    // Add CSS for the chat separator
    const style = document.createElement('style');
    style.textContent = `
    :root {
        --button-bg: rgba(255, 255, 255, 0.15);
        --button-hover: rgba(255, 255, 255, 0.25);
    }
    
    .chat-separator {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 8px 0;
    }

    .chat-separator::before,
    .chat-separator::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--border-color);
    }

    .chat-separator span {
        padding: 0 5px;
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--light-text);
        font-weight: 600;
        background-color: var(--background-color);
    }
    
    /* Button Styles - Unified for all action buttons */
    .try-again-button, .start-over-button, .analyze-button, .continue-chat-button, #send-chat-btn {
        width: 16px;
        height: 16px;
        font-size: 0.5rem;
        box-shadow: none;
        background-color: var(--button-bg);
        color: white;
        border: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background-color 0.2s ease;
        padding: 0;
        margin: 0;
    }
    
    .try-again-button:hover, .start-over-button:hover, .analyze-button:hover, .continue-chat-button:hover, #send-chat-btn:hover {
        background-color: var(--button-hover);
    }
    
    /* Special positioning for send button */
    #send-chat-btn {
        margin-left: 3px;
        align-self: flex-end;
    }
    
    /* Chat Input Area Styles */
    .chat-input-area {
        display: flex;
        margin-top: 5px;
        background-color: var(--input-bg);
        border-radius: 4px;
        padding: 3px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    #continue-chat-input {
        flex: 1;
        border: none;
        background-color: transparent;
        color: var(--text-color);
        font-family: inherit;
        font-size: 0.7rem;
        padding: 3px;
        min-height: 20px;
        resize: vertical;
        outline: none;
    }
    
    /* Adjust button spacing */
    .button-row {
        gap: 3px;
        display: flex;
        justify-content: flex-start;
        margin-top: 5px;
        margin-bottom: 10px;
        width: 100%;
        padding-left: 5px;
    }
    
    .left-buttons, .right-buttons {
        gap: 3px;
        display: flex;
    }
    
    /* Make analysis panel much smaller but maintain 100% width */
    #analysis-panel {
        width: 100%;
        max-width: 100%;
        max-height: 60vh;
        padding: 6px;
        font-size: 0.7rem;
        border-radius: 4px;
        border: 1px solid var(--border-color);
        box-sizing: border-box;
        margin-top: 5px;
    }
    
    #analysis-panel h2 {
        font-size: 0.8rem;
        margin-bottom: 5px;
        color: var(--text-color);
    }
    
    #analysis-panel .tab-buttons {
        margin-bottom: 5px;
        display: flex;
        width: 100%;
    }
    
    #analysis-panel .tab-button {
        padding: 2px 4px;
        font-size: 0.6rem;
        border-radius: 2px;
        flex: 1;
        text-align: center;
    }
    
    #analysis-panel .tab-button.active {
        background-color: var(--button-bg);
    }
    
    #analysis-panel .metric-bar {
        height: 3px;
        margin: 2px 0;
        border-radius: 1px;
        background-color: var(--border-color);
    }
    
    #analysis-panel .metric-bar-fill {
        background-color: var(--accent-color);
    }
    
    #analysis-panel .metric-info {
        margin-bottom: 4px;
        width: 100%;
    }
    
    #analysis-panel .metric-label {
        font-size: 0.65rem;
        display: inline-block;
        width: 70%;
    }
    
    #analysis-panel .metric-score {
        font-size: 0.65rem;
        color: var(--accent-color);
        display: inline-block;
        width: 30%;
        text-align: right;
    }
    
    #analysis-panel .metric-feedback {
        font-size: 0.65rem;
        margin-top: 2px;
        width: 100%;
    }
    
    #analysis-panel .improved-prompt-section {
        margin-top: 5px;
        width: 100%;
    }
    
    #analysis-panel #improved-prompt-text {
        font-size: 0.7rem;
        padding: 3px;
        border-radius: 2px;
        border: 1px solid var(--border-color);
        width: 100%;
        box-sizing: border-box;
    }
    
    #analysis-panel #use-improved-prompt {
        padding: 2px 4px;
        font-size: 0.6rem;
        margin-top: 3px;
        border-radius: 2px;
        background-color: var(--button-bg);
        width: 100%;
        text-align: center;
    }
    
    #analysis-panel #use-improved-prompt:hover {
        background-color: var(--button-hover);
    }
    
    #analysis-panel .close-button {
        top: 3px;
        right: 3px;
        width: 14px;
        height: 14px;
        font-size: 0.6rem;
        border-radius: 50%;
        background-color: var(--button-bg);
    }
    
    #analysis-panel .close-button:hover {
        background-color: var(--button-hover);
    }
    
    /* Make all input areas more compact */
    .input-area {
        padding: 3px;
    }
    
    .input-area textarea {
        padding: 3px;
        font-size: 0.7rem;
    }
    
    .input-area button {
        padding: 3px 6px;
        font-size: 0.7rem;
        background-color: var(--button-bg);
    }
    
    .input-area button:hover {
        background-color: var(--button-hover);
    }
    
    /* Make message bubbles smaller */
    .message {
        padding: 5px;
        margin: 3px 0;
        max-width: 85%;
        font-size: 0.7rem;
    }
    
    /* Adjust progress bar */
    .progress-bar {
        height: 3px;
    }
    
    .progress-fill {
        background-color: var(--accent-color);
    }
    
    /* Make step indicators smaller */
    .step-indicator {
        font-size: 0.6rem;
    }
    
    /* Adjust main container padding */
    .container {
        padding: 5px;
    }
    
    /* Make header smaller */
    .app-header h1 {
        font-size: 1rem;
    }
    
    .app-header p {
        font-size: 0.7rem;
    }
    
    /* Original prompt comparison */
    .original-prompt-comparison {
        width: 100%;
        box-sizing: border-box;
    }
    
    /* Tab panes */
    .tab-pane {
        width: 100%;
    }
    
    /* Match info */
    .match-info {
        width: 100%;
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

    // Add event listener for "Use This Prompt" button
    const useImprovedPromptBtn = document.getElementById('use-improved-prompt');
    if (useImprovedPromptBtn) {
        useImprovedPromptBtn.addEventListener('click', () => {
            const improvedPrompt = document.getElementById('improved-prompt-text').textContent;
            
            // Track improved prompt usage
            trackEvent('improved_prompt_used', {
                matchPercentage: window.currentAnalysisData.matchPercentage
            });
            
            // Hide analysis panel
            analysisPanel.classList.add('hidden');
            
            // Set the prompt input value to the improved prompt
            promptInput.value = improvedPrompt;
            
            // Add system message
            addMessage('system', createFeatherIcon('zap') + ' Using the improved prompt. Click send to try it.');
            
            // Focus on prompt input
            promptInput.focus();
        });
    }

    // Function to track analytics events
    function trackEvent(eventName, properties = {}) {
        try {
            // Track with Vercel Analytics client-side if available
            if (window.va) {
                window.va('event', {
                    name: eventName,
                    ...properties
                });
            }
            
            // Also send to our server-side tracking
            fetch('/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event: eventName,
                    properties
                })
            }).catch(error => {
                console.error('Error sending analytics:', error);
            });
        } catch (error) {
            console.error('Analytics error:', error);
        }
    }

    // Initialize Feather icons
    feather.replace();
}); 