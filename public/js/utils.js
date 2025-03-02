// utils.js - Utility functions for the application

// Loading tips to display during API calls
const LOADING_TIPS = [
    "Great prompts are specific, clear, and provide context.",
    "Try including examples in your prompts for better results.",
    "Consider the tone and style you want in the AI's response.",
    "Break complex tasks into smaller, clearer instructions.",
    "Specify the format you want for the response.",
    "Provide relevant background information for context.",
    "Be explicit about what you don't want in the response.",
    "Review and refine your prompts based on the results you get."
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
 * Update the loading message with a random tip or custom message
 * @param {string} type - The type of loading message
 * @param {string} customMessage - Optional custom message to display
 */
export function updateLoadingMessage(type = 'default', customMessage = null) {
    const loadingElement = document.getElementById('loading-message');
    if (!loadingElement) return;
    
    if (customMessage) {
        loadingElement.textContent = customMessage;
    } else {
        loadingElement.textContent = LOADING_MESSAGES[type] || LOADING_MESSAGES.default;
    }
    
    // Display a random tip
    const tipElement = document.getElementById('loading-tip');
    if (tipElement) {
        const randomIndex = Math.floor(Math.random() * LOADING_TIPS.length);
        tipElement.textContent = LOADING_TIPS[randomIndex];
    }
}

/**
 * Add typing animation effect
 * @param {HTMLElement} element - The element to add text to
 * @param {string} text - The text to type
 * @param {number} speed - The typing speed in milliseconds
 * @returns {Promise} - Resolves when typing is complete
 */
export function typeText(element, text, speed = 30) {
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

/**
 * Add typing animation with formatted paragraphs
 * @param {HTMLElement} container - The container to add text to
 * @param {string} text - The text to type
 * @param {number} speed - The typing speed in milliseconds
 * @returns {Promise} - Resolves when typing is complete
 */
export function typeTextFormatted(container, text, speed = 30) {
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

/**
 * Helper function to format AI responses with proper paragraphs
 * @param {string} text - The text to format
 * @returns {string} - The formatted HTML
 */
export function formatAIResponse(text) {
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