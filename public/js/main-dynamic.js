// main-dynamic.js - Main entry point for the application using dynamic imports

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, loading modules...');
    
    try {
        // Dynamically import modules
        const utils = await import('./utils.js');
        const ui = await import('./ui.js');
        const api = await import('./api.js');
        const buttons = await import('./buttons.js');
        
        console.log('All modules loaded successfully');
        
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
        ui.initUI(elements);
        
        // Display initial loading message and tip
        utils.updateLoadingMessage('health');
        
        // Show loading overlay during initial health check
        elements.loadingOverlay.style.display = 'flex';
        
        // Check server health on load
        api.checkServerHealth()
            .then(isHealthy => {
                // Hide loading overlay
                elements.loadingOverlay.style.display = 'none';
                
                if (isHealthy) {
                    console.log('Server is healthy');
                    ui.addSystemMessage('<i class="fas fa-check-circle fa-xs"></i> Connected to server successfully!');
                } else {
                    console.error('Server health check failed');
                    ui.addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Could not connect to the AI service. Some features may be limited.');
                }
            })
            .catch(error => {
                // Hide loading overlay
                elements.loadingOverlay.style.display = 'none';
                
                console.error('Server health check error:', error);
                ui.addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Error connecting to the server. Please try again later.');
            });
        
        // Set up event listeners
        setupEventListeners(elements, utils, ui, api, buttons);
    } catch (error) {
        console.error('Error loading modules:', error);
        document.body.innerHTML += `<div style="color: red; padding: 20px;">Error loading modules: ${error.message}</div>`;
    }
});

/**
 * Set up event listeners for the application
 * @param {Object} elements - DOM elements
 * @param {Object} utils - Utils module
 * @param {Object} ui - UI module
 * @param {Object} api - API module
 * @param {Object} buttons - Buttons module
 */
function setupEventListeners(elements, utils, ui, api, buttons) {
    // Step 1: Goal Input
    elements.goalNextBtn.addEventListener('click', () => {
        const goalText = elements.goalInput.value.trim();
        
        if (!goalText) {
            ui.addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Please enter a goal for your prompt.');
            return;
        }
        
        // Update progress to step 2
        ui.updateProgress(2, elements);
        
        // Add the goal to the chat
        ui.addMessage('user', goalText, 'Your Goal:');
        
        // Focus on the prompt input
        elements.promptInput.focus();
    });
    
    // Step 2: Prompt Input
    elements.promptNextBtn.addEventListener('click', () => {
        const promptText = elements.promptInput.value.trim();
        const goalText = elements.goalInput.value.trim();
        
        if (!promptText) {
            ui.addSystemMessage('<i class="fas fa-exclamation-triangle fa-xs"></i> Please enter a prompt.');
            return;
        }
        
        // Add the prompt to the chat
        ui.addMessage('user', promptText, 'Your Prompt:');
        
        // Show loading overlay with generate message
        elements.loadingOverlay.style.display = 'flex';
        utils.updateLoadingMessage('generate');
        
        // Generate response
        api.generateResponse(
            promptText,
            goalText,
            // Success callback
            (data) => {
                // Hide loading overlay
                elements.loadingOverlay.style.display = 'none';
                
                // Update progress to step 3
                ui.updateProgress(3, elements);
                
                // Add the AI response to the chat
                ui.addMessage('ai', data.response, '', true)
                    .then(() => {
                        // Add buttons for the result step
                        buttons.addResultButtons(
                            elements,
                            null,
                            // Try Again callback
                            () => {
                                // Go back to step 2
                                ui.updateProgress(2, elements);
                                
                                // Focus on the prompt input
                                elements.promptInput.focus();
                            },
                            // Start Over callback
                            () => {
                                // Go back to step 1
                                ui.updateProgress(1, elements);
                                
                                // Clear inputs
                                elements.promptInput.value = '';
                                
                                // Focus on the goal input
                                elements.goalInput.focus();
                            },
                            // Analyze callback
                            () => {
                                analyzePrompt(elements, promptText, goalText, utils, ui, api, buttons);
                            }
                        );
                    });
            },
            // Error callback
            (errorMessage) => {
                // Hide loading overlay
                elements.loadingOverlay.style.display = 'none';
                
                // Show error message
                ui.addSystemMessage(`<i class="fas fa-exclamation-triangle fa-xs"></i> ${errorMessage}`);
                
                // Go back to step 2
                ui.updateProgress(2, elements);
            },
            // Retry callback
            (retryMessage) => {
                utils.updateLoadingMessage('retry', retryMessage);
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
    ui.setupAnalysisTabs();
}

/**
 * Analyze a prompt and show the analysis panel
 * @param {Object} elements - DOM elements
 * @param {string} promptText - The prompt text to analyze
 * @param {string} goalText - The goal text
 * @param {Object} utils - Utils module
 * @param {Object} ui - UI module
 * @param {Object} api - API module
 * @param {Object} buttons - Buttons module
 */
function analyzePrompt(elements, promptText, goalText, utils, ui, api, buttons) {
    // Show loading overlay with analyze message
    elements.loadingOverlay.style.display = 'flex';
    utils.updateLoadingMessage('evaluate');
    
    // Show the analysis panel
    elements.analysisPanel.style.display = 'block';
    
    // Evaluate the prompt
    api.evaluatePrompt(
        promptText,
        goalText,
        // Success callback
        (data) => {
            // Hide loading overlay
            elements.loadingOverlay.style.display = 'none';
            
            // Update the analysis panel with the results
            ui.updateAnalysisPanel(data);
            
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
                    ui.updateProgress(2, elements);
                    
                    // Show loading overlay with generate message
                    elements.loadingOverlay.style.display = 'flex';
                    utils.updateLoadingMessage('generate');
                    
                    // Generate response with the improved prompt
                    api.generateResponse(
                        improvedPrompt,
                        goalText,
                        // Success callback
                        (data) => {
                            // Hide loading overlay
                            elements.loadingOverlay.style.display = 'none';
                            
                            // Update progress to step 3
                            ui.updateProgress(3, elements);
                            
                            // Add the AI response to the chat
                            ui.addMessage('ai', data.response, '', true)
                                .then(() => {
                                    // Add buttons for the result step
                                    buttons.addResultButtons(
                                        elements,
                                        null,
                                        // Try Again callback
                                        () => {
                                            // Go back to step 2
                                            ui.updateProgress(2, elements);
                                            
                                            // Focus on the prompt input
                                            elements.promptInput.focus();
                                        },
                                        // Start Over callback
                                        () => {
                                            // Go back to step 1
                                            ui.updateProgress(1, elements);
                                            
                                            // Clear inputs
                                            elements.promptInput.value = '';
                                            
                                            // Focus on the goal input
                                            elements.goalInput.focus();
                                        },
                                        // Analyze callback
                                        () => {
                                            analyzePrompt(elements, improvedPrompt, goalText, utils, ui, api, buttons);
                                        }
                                    );
                                });
                        },
                        // Error callback
                        (errorMessage) => {
                            // Hide loading overlay
                            elements.loadingOverlay.style.display = 'none';
                            
                            // Show error message
                            ui.addSystemMessage(`<i class="fas fa-exclamation-triangle fa-xs"></i> ${errorMessage}`);
                            
                            // Go back to step 2
                            ui.updateProgress(2, elements);
                        },
                        // Retry callback
                        (retryMessage) => {
                            utils.updateLoadingMessage('retry', retryMessage);
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
            ui.addSystemMessage(`<i class="fas fa-exclamation-triangle fa-xs"></i> ${errorMessage}`);
        },
        // Retry callback
        (retryMessage) => {
            utils.updateLoadingMessage('retry', retryMessage);
        }
    );
} 