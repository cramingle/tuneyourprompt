// main-test.js - Simplified version of main.js for testing
import { formatAIResponse } from './utils.js';

console.log('main-test.js loaded successfully');

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // Test formatAIResponse function
    const formattedText = formatAIResponse('Test **bold** text');
    console.log('Formatted text:', formattedText);
}); 