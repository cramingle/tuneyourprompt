// ui.js - UI-related functions for the application
import { formatAIResponse, typeTextFormatted } from './utils.js';

let chatMessages;
let currentStep = 1;

/**
 * Initialize UI elements
 * @param {Object} elements - DOM elements
 */
export function initUI(elements) {
    chatMessages = elements.chatMessages;
    
    // Add CSS for the chat separator and other UI elements
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
}

/**
 * Helper function to add a message to the chat
 * @param {string} type - The type of message (user, ai, system)
 * @param {string|HTMLElement} content - The content of the message
 * @param {string} extraClasses - Extra CSS classes to add
 * @param {boolean} animate - Whether to animate the message
 * @returns {HTMLElement|Promise} - The message element or a promise that resolves when animation is complete
 */
export function addMessage(type, content, extraClasses = '', animate = false) {
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
                return messageDiv;
            });
        } else if (type === 'ai') {
            // Format AI responses with proper paragraphs
            const formattedContent = formatAIResponse(content);
            contentDiv.innerHTML = formattedContent;
            messageDiv.appendChild(contentDiv);
            chatMessages.appendChild(messageDiv);
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

/**
 * Add a system message to the chat
 * @param {string} text - The text to add
 */
export function addSystemMessage(text) {
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

/**
 * Update progress bar and indicators
 * @param {number} step - The current step (1-5)
 * @param {Object} elements - DOM elements
 */
export function updateProgress(step, elements) {
    currentStep = step;
    
    // Update progress bar with animation
    elements.progressFill.style.width = `${(step / 5) * 100}%`;
    
    // Update step indicators
    elements.stepIndicator1.className = step >= 1 ? 'step active' : 'step';
    elements.stepIndicator2.className = step >= 2 ? 'step active' : 'step';
    elements.stepIndicator3.className = step >= 3 ? 'step active' : 'step';
    elements.stepIndicator4.className = step >= 4 ? 'step active' : 'step';
    elements.stepIndicator5.className = step >= 5 ? 'step active' : 'step';
    
    if (step > 1) {
        elements.stepIndicator1.className = 'step completed';
    }
    if (step > 2) {
        elements.stepIndicator2.className = 'step completed';
    }
    if (step > 3) {
        elements.stepIndicator3.className = 'step completed';
    }
    if (step > 4) {
        elements.stepIndicator4.className = 'step completed';
    }
    
    // Show/hide input areas with smooth transitions
    if (step === 1) {
        elements.goalInputArea.className = 'input-area';
        elements.promptInputArea.className = 'input-area hidden';
        elements.tryAgainArea.className = 'input-area hidden';
        // Hide panels
        elements.analysisPanel.classList.add('hidden');
        elements.finalResultPanel.classList.add('hidden');
    } else if (step === 2) {
        elements.goalInputArea.className = 'input-area hidden';
        elements.promptInputArea.className = 'input-area';
        elements.tryAgainArea.className = 'input-area hidden';
        // Hide panels
        elements.analysisPanel.classList.add('hidden');
        elements.finalResultPanel.classList.add('hidden');
    } else if (step === 3) {
        elements.goalInputArea.className = 'input-area hidden';
        elements.promptInputArea.className = 'input-area hidden';
        elements.tryAgainArea.className = 'input-area';
        // Hide both panels in Result step - only show chat messages
        elements.analysisPanel.classList.add('hidden');
        elements.finalResultPanel.classList.add('hidden');
    } else if (step === 4) {
        elements.goalInputArea.className = 'input-area hidden';
        elements.promptInputArea.className = 'input-area hidden';
        elements.tryAgainArea.className = 'input-area hidden';
        // Show analysis panel
        elements.analysisPanel.classList.remove('hidden');
        elements.finalResultPanel.classList.add('hidden');
    } else if (step === 5) {
        elements.goalInputArea.className = 'input-area hidden';
        elements.promptInputArea.className = 'input-area hidden';
        elements.tryAgainArea.className = 'input-area';
        // Always keep final result panel hidden, we're using chat separator instead
        elements.analysisPanel.classList.add('hidden');
        elements.finalResultPanel.classList.add('hidden');
    }
}

/**
 * Function to handle tab switching in analysis panel
 */
export function setupAnalysisTabs() {
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

/**
 * Function to update the analysis panel with the analysis results
 * @param {Object} data - Analysis data
 */
export function updateAnalysisPanel(data) {
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