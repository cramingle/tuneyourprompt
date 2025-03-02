// main.js - Main entry point for the application
import { typeText, typeTextFormatted, formatAIResponse } from './utils.js';
import { initUI, addMessage, addSystemMessage, updateProgress, setupAnalysisTabs, updateAnalysisPanel } from './ui.js';
import { checkServerHealth, evaluatePrompt, generateResponse } from './api.js';
import { addFinalStepButtons, createChatInputArea, addResultButtons } from './buttons.js';

// Loading tips to display during API calls
const LOADING_TIPS = [
    "Great prompts are specific, clear, and provide context.",
    "Try including examples in your prompts for better results.",
    "Be explicit about the format you want in your response.",
    "Specify your audience to get appropriately tailored content.",
    "Adding 'step by step' to your prompt often yields more detailed responses.",
    "For creative tasks, describe the style, tone, and mood you want.",
    "When asking for code, specify the programming language and any constraints.",
    "Longer prompts with more details generally produce better results.",
    "Use system prompts to set the AI's behavior and knowledge context.",
    "Chain of thought prompting helps AI solve complex problems.",
    "For factual responses, ask the AI to cite its sources.",
    "Prompt engineering is both an art and a science - practice makes perfect!"
];

// Loading messages for different operations
const LOADING_MESSAGES = {
    default: "Processing Request",
    health: "Connecting to AI",
    generate: "Crafting Response",
    evaluate: "Analyzing Prompt",
    retry: "Retrying Connection"
};

/**
 * Display a random loading tip
 */
function displayRandomTip() {
    const tipElement = document.getElementById('loading-tip');
    if (tipElement) {
        const randomIndex = Math.floor(Math.random() * LOADING_TIPS.length);
        tipElement.textContent = LOADING_TIPS[randomIndex];
    }
}

/**
 * Update the loading message
 * @param {string} type - The type of operation
 * @param {string} customMessage - Optional custom message
 */
function updateLoadingMessage(type = 'default', customMessage = null) {
    const messageElement = document.getElementById('loading-message');
    if (messageElement) {
        if (customMessage) {
            messageElement.textContent = customMessage;
        } else {
            messageElement.textContent = LOADING_MESSAGES[type] || LOADING_MESSAGES.default;
        }
    }
    // Always display a random tip when updating the message
    displayRandomTip();
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const elements = {
        // Chat elements
        chatMessages: document.getElementById('chat-messages'),
        
        // Input areas
        goalInputArea: document.getElementById('goal-input-area'),
        promptInputArea: document.getElementById('prompt-input-area'),
        tryAgainArea: document.getElementById('try-again-area'),
        
        // Inputs
        goalInput: document.getElementById('goal-input'),
        promptInput: document.getElementById('prompt-input'),
        
        // Buttons
        goalNextBtn: document.getElementById('goal-next'),
        promptNextBtn: document.getElementById('prompt-next'),
        
        // Progress elements
        progressFill: document.getElementById('progress-fill'),
        stepIndicator1: document.getElementById('step-indicator-1'),
        stepIndicator2: document.getElementById('step-indicator-2'),
        stepIndicator3: document.getElementById('step-indicator-3'),
        stepIndicator4: document.getElementById('step-indicator-4'),
        stepIndicator5: document.getElementById('step-indicator-5'),
        
        // Panels
        analysisPanel: document.getElementById('analysis-panel'),
        finalResultPanel: document.getElementById('final-result-panel'),
        
        // Analysis panel elements
        closeAnalysisBtn: document.getElementById('close-analysis'),
        
        // Loading overlay
        loadingOverlay: document.getElementById('loading-overlay'),
        loadingMessage: document.getElementById('loading-message')
    };
    
    // Initialize UI with elements
    initUI(elements);
    
    // Display initial loading message and tip
    updateLoadingMessage('health');
    
    // Show loading overlay during initial health check
    elements.loadingOverlay.style.display = 'flex';
    
    // Check server health on load
    checkServerHealth()
        .then(isHealthy => {
            // Hide loading overlay
            elements.loadingOverlay.style.display = 'none';
            
            if (isHealthy) {
                console.log('Server is healthy');
                addSystemMessage('<i class="fas fa-check-circle fa-xs"></i> Connected to server successfully!');
            } else {
                console.error('Server health check failed');
                addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Could not connect to the AI service. Some features may be limited.');
            }
        })
        .catch(error => {
            // Hide loading overlay
            elements.loadingOverlay.style.display = 'none';
            
            console.error('Server health check error:', error);
            addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Error connecting to the server. Please try again later.');
        });
    
    // Set up event listeners
    setupEventListeners(elements);
});

/**
 * Set up event listeners for the application
 * @param {Object} elements - DOM elements
 */
function setupEventListeners(elements) {
    // Step 1: Goal Input
    elements.goalNextBtn.addEventListener('click', () => {
        const goalText = elements.goalInput.value.trim();
        
        if (!goalText) {
            addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Please enter a goal for your prompt.');
            return;
        }
        
        // Update progress to step 2
        updateProgress(2, elements);
        
        // Add the goal to the chat
        addMessage('user', goalText, 'Your Goal:');
        
        // Focus on the prompt input
        elements.promptInput.focus();
    });
    
    // Step 2: Prompt Input
    elements.promptNextBtn.addEventListener('click', () => {
        const promptText = elements.promptInput.value.trim();
        const goalText = elements.goalInput.value.trim();
        
        if (!promptText) {
            addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Please enter a prompt.');
            return;
        }
        
        // Add the prompt to the chat
        addMessage('user', promptText, 'Your Prompt:');
        
        // Show loading overlay with generate message
        elements.loadingOverlay.style.display = 'flex';
        updateLoadingMessage('generate');
        
        // Generate response
        generateResponse(
            promptText,
            goalText,
            // Success callback
            (data) => {
                // Hide loading overlay
                elements.loadingOverlay.style.display = 'none';
                
                // Update progress to step 3
                updateProgress(3, elements);
                
                // Add the AI response to the chat
                addMessage('ai', data.response, '', true)
                    .then(() => {
                        // Add buttons for the result step
                        addResultButtons(
                            elements,
                            null,
                            // Try Again callback
                            () => {
                                // Go back to step 2
                                updateProgress(2, elements);
                                
                                // Focus on the prompt input
                                elements.promptInput.focus();
                            },
                            // Start Over callback
                            () => {
                                // Go back to step 1
                                updateProgress(1, elements);
                                
                                // Clear inputs
                                elements.promptInput.value = '';
                                
                                // Focus on the goal input
                                elements.goalInput.focus();
                            },
                            // Analyze callback
                            () => {
                                analyzePrompt(elements, promptText, goalText);
                            }
                        );
                    });
            },
            // Error callback
            (errorMessage) => {
                // Hide loading overlay
                elements.loadingOverlay.style.display = 'none';
                
                // Show error message
                addSystemMessage(`<i class="fas fa-exclamation-triangle fa-xs"></i> ${errorMessage}`);
                
                // Go back to step 2
                updateProgress(2, elements);
            },
            // Retry callback
            (retryMessage) => {
                updateLoadingMessage('retry', retryMessage);
            }
        );
    });
    
    // Enter key event for inputs
    elements.goalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.goalNextBtn.click();
        }
    });
    
    elements.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            elements.promptNextBtn.click();
        }
    });
    
    // Close button for analysis panel
    elements.closeAnalysisBtn.addEventListener('click', () => {
        elements.analysisPanel.style.display = 'none';
    });
    
    // Set up analysis tabs
    setupAnalysisTabs();
}

/**
 * Analyze a prompt and show the analysis panel
 * @param {Object} elements - DOM elements
 * @param {string} promptText - The prompt text to analyze
 * @param {string} goalText - The goal text
 */
function analyzePrompt(elements, promptText, goalText) {
    // Show loading overlay with analyze message
    elements.loadingOverlay.style.display = 'flex';
    updateLoadingMessage('evaluate');
    
    // Show the analysis panel
    elements.analysisPanel.style.display = 'block';
    
    // Evaluate the prompt
    evaluatePrompt(
        promptText,
        goalText,
        // Success callback
        (data) => {
            // Hide loading overlay
            elements.loadingOverlay.style.display = 'none';
            
            // Update the analysis panel with the results
            updateAnalysisPanel(data);
            
            // Add event listener for the "Use Improved Prompt" button
            const useImprovedPromptBtn = document.getElementById('use-improved-prompt');
            if (useImprovedPromptBtn) {
                useImprovedPromptBtn.addEventListener('click', () => {
                    // Get the improved prompt
                    const improvedPrompt = data.improved_prompt || data.analysis.improvedPrompt;
                    
                    // Close the analysis panel
                    elements.analysisPanel.style.display = 'none';
                    
                    // Update the prompt input with the improved prompt
                    elements.promptInput.value = improvedPrompt;
                    
                    // Go back to step 2
                    updateProgress(2, elements);
                    
                    // Show loading overlay with generate message
                    elements.loadingOverlay.style.display = 'flex';
                    updateLoadingMessage('generate');
                    
                    // Generate response with the improved prompt
                    generateResponse(
                        improvedPrompt,
                        goalText,
                        // Success callback
                        (data) => {
                            // Hide loading overlay
                            elements.loadingOverlay.style.display = 'none';
                            
                            // Update progress to step 3
                            updateProgress(3, elements);
                            
                            // Add the AI response to the chat
                            addMessage('ai', data.response, '', true)
                                .then(() => {
                                    // Add buttons for the result step
                                    addResultButtons(
                                        elements,
                                        null,
                                        // Try Again callback
                                        () => {
                                            // Go back to step 2
                                            updateProgress(2, elements);
                                            
                                            // Focus on the prompt input
                                            elements.promptInput.focus();
                                        },
                                        // Start Over callback
                                        () => {
                                            // Go back to step 1
                                            updateProgress(1, elements);
                                            
                                            // Clear inputs
                                            elements.promptInput.value = '';
                                            
                                            // Focus on the goal input
                                            elements.goalInput.focus();
                                        },
                                        // Analyze callback
                                        () => {
                                            analyzePrompt(elements, improvedPrompt, goalText);
                                        }
                                    );
                                });
                        },
                        // Error callback
                        (errorMessage) => {
                            // Hide loading overlay
                            elements.loadingOverlay.style.display = 'none';
                            
                            // Show error message
                            addSystemMessage(`<i class="fas fa-exclamation-triangle fa-xs"></i> ${errorMessage}`);
                            
                            // Go back to step 2
                            updateProgress(2, elements);
                        },
                        // Retry callback
                        (retryMessage) => {
                            updateLoadingMessage('retry', retryMessage);
                        }
                    );
                });
            }
        },
        // Error callback
        (errorMessage) => {
            // Hide loading overlay
            elements.loadingOverlay.style.display = 'none';
            
            // Close the analysis panel
            elements.analysisPanel.style.display = 'none';
            
            // Show error message
            addSystemMessage(`<i class="fas fa-exclamation-triangle fa-xs"></i> ${errorMessage}`);
        },
        // Retry callback
        (retryMessage) => {
            updateLoadingMessage('retry', retryMessage);
        }
    );
}

// Export functions for use in other modules
export { updateLoadingMessage, displayRandomTip }; 