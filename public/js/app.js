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
    
    // Helper function to create feedback element
    function createFeedbackElement(data) {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'feedback-container';
        
        // Header with match score
        const feedbackHeader = document.createElement('div');
        feedbackHeader.className = 'feedback-header';
        
        const feedbackTitle = document.createElement('div');
        feedbackTitle.className = 'feedback-title';
        feedbackTitle.textContent = 'Prompt Analysis';
        
        const matchScore = document.createElement('div');
        matchScore.className = 'match-score';
        matchScore.textContent = `${data.matchPercentage}% Match`;
        
        // Set color based on score
        if (data.matchPercentage >= 80) {
            matchScore.style.backgroundColor = 'var(--success-color)';
        } else if (data.matchPercentage >= 50) {
            matchScore.style.backgroundColor = 'var(--warning-color)';
        } else {
            matchScore.style.backgroundColor = 'var(--error-color)';
        }
        
        feedbackHeader.appendChild(feedbackTitle);
        feedbackHeader.appendChild(matchScore);
        feedbackContainer.appendChild(feedbackHeader);
        
        // Feedback categories
        const feedbackCategories = document.createElement('div');
        feedbackCategories.className = 'feedback-categories';
        
        // Clarity
        const clarityCategory = createFeedbackCategory(
            'Clarity', 
            data.qualityAnalysis.clarity.score, 
            data.qualityAnalysis.clarity.feedback
        );
        feedbackCategories.appendChild(clarityCategory);
        
        // Detail
        const detailCategory = createFeedbackCategory(
            'Detail', 
            data.qualityAnalysis.detail.score, 
            data.qualityAnalysis.detail.feedback
        );
        feedbackCategories.appendChild(detailCategory);
        
        // Relevance
        const relevanceCategory = createFeedbackCategory(
            'Relevance', 
            data.qualityAnalysis.relevance.score, 
            data.qualityAnalysis.relevance.feedback
        );
        feedbackCategories.appendChild(relevanceCategory);
        
        feedbackContainer.appendChild(feedbackCategories);
        
        // Suggestion
        const suggestionContainer = document.createElement('div');
        suggestionContainer.className = 'suggestion-container';
        
        const suggestionTitle = document.createElement('div');
        suggestionTitle.className = 'suggestion-title';
        suggestionTitle.textContent = 'Try this improved prompt:';
        
        const suggestionText = document.createElement('div');
        suggestionText.className = 'suggestion-text';
        suggestionText.textContent = data.improvedPrompt;
        
        suggestionContainer.appendChild(suggestionTitle);
        suggestionContainer.appendChild(suggestionText);
        feedbackContainer.appendChild(suggestionContainer);
        
        // Add mock data notice if Ollama is not available
        if (!ollamaAvailable) {
            const mockNotice = document.createElement('div');
            mockNotice.className = 'mock-notice';
            mockNotice.innerHTML = '<p><strong>Note:</strong> Using simulated AI responses because the AI API is not available.</p>';
            feedbackContainer.appendChild(mockNotice);
        }
        
        return feedbackContainer;
    }
    
    // Helper function to create a feedback category
    function createFeedbackCategory(name, score, feedback) {
        const category = document.createElement('div');
        category.className = 'feedback-category';
        
        const header = document.createElement('div');
        header.className = 'category-header';
        
        const categoryName = document.createElement('div');
        categoryName.className = 'category-name';
        categoryName.textContent = name;
        
        const scoreBar = document.createElement('div');
        scoreBar.className = 'score-bar';
        
        const scoreBarFill = document.createElement('div');
        scoreBarFill.className = 'score-bar-fill';
        // Set width after a small delay for animation
        setTimeout(() => {
            scoreBarFill.style.width = `${score}%`;
        }, 100);
        
        scoreBar.appendChild(scoreBarFill);
        
        header.appendChild(categoryName);
        header.appendChild(scoreBar);
        
        const feedbackText = document.createElement('div');
        feedbackText.className = 'category-feedback';
        feedbackText.textContent = feedback;
        
        category.appendChild(header);
        category.appendChild(feedbackText);
        
        return category;
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
        
        try {
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
            });
            
            if (!response.ok) {
                throw new Error('Failed to evaluate prompt');
            }
            
            const data = await response.json();
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
            
            // Add AI response message with typing animation
            addMessage('ai', data.aiResponse, '', true);
            
            // Add feedback message after a short delay
            setTimeout(() => {
                const feedbackElement = createFeedbackElement(data);
                addMessage('system', feedbackElement, 'feedback-message');
                
                // Move to step 3
                updateProgress(3);
            }, 1000);
            
        } catch (error) {
            console.error('Error:', error);
            addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> An error occurred while evaluating your prompt. Please try again.');
            
            // Hide loading overlay
            loadingOverlay.style.display = 'none';
        }
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
            const response = await fetch('/api/health');
            if (response.ok) {
                const data = await response.json();
                console.log('Server health:', data);
                
                if (data.ollama === 'connected') {
                    ollamaAvailable = true;
                    console.log('AI API is available');
                } else {
                    ollamaAvailable = false;
                    console.warn('AI API is not available, using mock responses');
                    addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> Note: AI API is not available. The app will use simulated AI responses.');
                }
            } else {
                console.warn('Server health check failed');
                addMessage('system', '<i class="fas fa-exclamation-triangle fa-xs"></i> Warning: Server health check failed. Some features may not work properly.');
            }
        } catch (error) {
            console.error('Server connection error:', error);
            addMessage('system', '<i class="fas fa-times-circle fa-xs"></i> Error: Cannot connect to the server. Please check your connection and reload the page.');
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
}); 