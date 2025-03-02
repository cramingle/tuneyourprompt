// buttons.js - Button-related functions for the application
import { addMessage, addSystemMessage, updateProgress } from './ui.js';
import { continueChatConversation } from './api.js';
import { updateLoadingMessage } from './utils.js';

/**
 * Function to add Try Again and Start Over buttons for the final step
 * @param {Object} elements - DOM elements
 * @param {Function} onTryAgain - Callback for try again button
 * @param {Function} onStartOver - Callback for start over button
 */
export function addFinalStepButtons(elements, onTryAgain, onStartOver) {
    // Add Try Again and Start Over buttons to the try-again-area
    const tryAgainArea = elements.tryAgainArea;
    tryAgainArea.innerHTML = '';
    
    const buttonRow = document.createElement('div');
    buttonRow.className = 'button-row';
    
    // Create Try Again button
    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.className = 'try-again-button';
    tryAgainBtn.innerHTML = '<i class="fas fa-redo"></i>';
    tryAgainBtn.title = 'Try Again';
    tryAgainBtn.addEventListener('click', onTryAgain);
    
    // Create Start Over button
    const startOverBtn = document.createElement('button');
    startOverBtn.className = 'start-over-button';
    startOverBtn.innerHTML = '<i class="fas fa-sync"></i>';
    startOverBtn.title = 'Start Over';
    startOverBtn.addEventListener('click', onStartOver);
    
    // Create Continue Chat button
    const continueChatBtn = document.createElement('button');
    continueChatBtn.className = 'continue-chat-button';
    continueChatBtn.innerHTML = '<i class="fas fa-comment"></i>';
    continueChatBtn.title = 'Continue Chat';
    continueChatBtn.addEventListener('click', () => {
        createChatInputArea(elements, onTryAgain, onStartOver);
    });
    
    // Create a left side container for try again and start over buttons
    const leftButtonsContainer = document.createElement('div');
    leftButtonsContainer.className = 'left-buttons';
    leftButtonsContainer.appendChild(tryAgainBtn);
    leftButtonsContainer.appendChild(startOverBtn);
    
    // Add the left buttons container to the button row
    buttonRow.appendChild(leftButtonsContainer);
    
    // Create a right side container for the continue chat button
    const rightButtonsContainer = document.createElement('div');
    rightButtonsContainer.className = 'right-buttons';
    rightButtonsContainer.appendChild(continueChatBtn);
    
    // Add the right buttons container to the button row
    buttonRow.appendChild(rightButtonsContainer);
    
    // Add the button row to the try-again-area
    tryAgainArea.appendChild(buttonRow);
}

/**
 * Create a chat input area for continuing the conversation
 * @param {Object} elements - DOM elements
 * @param {Function} onTryAgain - Callback for try again button
 * @param {Function} onStartOver - Callback for start over button
 */
export function createChatInputArea(elements, onTryAgain, onStartOver) {
    // Create a chat input area
    const chatInputArea = document.createElement('div');
    chatInputArea.className = 'chat-input-area';
    chatInputArea.innerHTML = `
        <div class="input-container">
            <textarea id="continue-chat-input" placeholder="Ask anything"></textarea>
            <button id="send-chat-btn"><i class="fas fa-paper-plane"></i></button>
        </div>
        <div class="action-buttons">
            <button class="action-btn plus-btn"><i class="fas fa-plus"></i></button>
            <button class="action-btn search-btn"><i class="fas fa-globe"></i> Search</button>
            <button class="action-btn reason-btn"><i class="far fa-lightbulb"></i> Reason</button>
        </div>
    `;
    
    // Replace the button row with the chat input area
    elements.tryAgainArea.innerHTML = '';
    elements.tryAgainArea.appendChild(chatInputArea);
    
    // Focus on the chat input
    document.getElementById('continue-chat-input').focus();
    
    // Add event listener for the send button
    document.getElementById('send-chat-btn').addEventListener('click', () => {
        sendContinueChatMessage(elements, onTryAgain, onStartOver);
    });
    
    // Add event listener for Enter key
    document.getElementById('continue-chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendContinueChatMessage(elements, onTryAgain, onStartOver);
        }
    });
    
    // Add a system message to prompt the user to continue the conversation
    const systemMessage = document.createElement('div');
    systemMessage.className = 'message system';
    systemMessage.innerHTML = `<div class="message-content"><i class="fas fa-info-circle"></i> Continue your conversation with the AI.</div>`;
    elements.messagesContainer.appendChild(systemMessage);
}

/**
 * Function to send a continue chat message
 * @param {Object} elements - DOM elements
 * @param {Function} onTryAgain - Callback for try again button
 * @param {Function} onStartOver - Callback for start over button
 */
export function sendContinueChatMessage(elements, onTryAgain, onStartOver) {
    const chatInput = document.getElementById('continue-chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage('user', message);
    
    // Clear input
    chatInput.value = '';
    
    // Show loading overlay
    elements.loadingOverlay.style.display = 'flex';
    updateLoadingMessage('generate', 'AI IS THINKING...');
    
    // Get the goal and previous context
    const goalText = elements.goalInput.value.trim();
    
    // Create a context from the previous messages
    const chatHistory = Array.from(elements.chatMessages.querySelectorAll('.message'))
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
    
    // Call the API to continue the chat
    continueChatConversation(
        message,
        goalText,
        chatHistory,
        // Success callback
        (data) => {
            // Hide loading overlay
            elements.loadingOverlay.style.display = 'none';
            
            // Add the AI response to the chat
            addMessage('ai', data.response, '', true);
            
            // Restore the continue chat input area
            createChatInputArea(elements, onTryAgain, onStartOver);
        },
        // Error callback
        (errorMessage) => {
            // Hide loading overlay
            elements.loadingOverlay.style.display = 'none';
            
            // Show error message
            addSystemMessage(`<i class="fas fa-exclamation-triangle fa-xs"></i> ${errorMessage}`);
            
            // Restore the buttons
            addFinalStepButtons(elements, onTryAgain, onStartOver);
        },
        // Retry callback
        (retryMessage) => {
            updateLoadingMessage('retry', retryMessage);
        }
    );
}

/**
 * Add buttons for the result step (step 3)
 * @param {Object} elements - DOM elements
 * @param {Object} analysisData - Analysis data
 * @param {Function} onTryAgain - Callback for try again button
 * @param {Function} onStartOver - Callback for start over button
 * @param {Function} onAnalyze - Callback for analyze button
 */
export function addResultButtons(elements, analysisData, onTryAgain, onStartOver, onAnalyze) {
    // Clear the try-again-area and add the analyze button
    const tryAgainArea = elements.tryAgainArea;
    tryAgainArea.innerHTML = '';
    
    const buttonRow = document.createElement('div');
    buttonRow.className = 'button-row';
    
    // Create analyze button
    const analyzeBtn = document.createElement('button');
    analyzeBtn.className = 'analyze-button';
    analyzeBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
    analyzeBtn.title = 'Analyze This Prompt';
    analyzeBtn.id = 'analyze-prompt-btn';
    analyzeBtn.addEventListener('click', onAnalyze);
    
    // Create Try Again button
    const tryAgainBtn = document.createElement('button');
    tryAgainBtn.className = 'try-again-button';
    tryAgainBtn.innerHTML = '<i class="fas fa-redo"></i>';
    tryAgainBtn.title = 'Try Again';
    tryAgainBtn.addEventListener('click', onTryAgain);
    
    // Create Start Over button
    const startOverBtn = document.createElement('button');
    startOverBtn.className = 'start-over-button';
    startOverBtn.innerHTML = '<i class="fas fa-sync"></i>';
    startOverBtn.title = 'Start Over';
    startOverBtn.addEventListener('click', onStartOver);
    
    // Create Continue Chat button
    const continueChatBtn = document.createElement('button');
    continueChatBtn.className = 'continue-chat-button';
    continueChatBtn.innerHTML = '<i class="fas fa-comment"></i>';
    continueChatBtn.title = 'Continue Chat';
    continueChatBtn.addEventListener('click', () => {
        createChatInputArea(elements, onTryAgain, onStartOver);
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
} 