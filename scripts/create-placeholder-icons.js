const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Function to create a valid PNG icon
function createIcon(size, color, outputPath) {
  // Create a canvas with the specified size
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fill the background with the specified color
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  
  // Add a simple design (a circle in the middle)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2);
  ctx.fill();
  
  // Add a letter in the middle
  ctx.fillStyle = color;
  ctx.font = `bold ${size/2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', size/2, size/2);
  
  // Save the canvas as a PNG file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`Created ${path.basename(outputPath)} (${size}x${size})`);
}

// Define icon sizes
const icons = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 }
];

// Purple color
const purpleColor = '#7C4DFF';

// Create the icons
const imgDir = path.join(__dirname, '..', 'public', 'img');

// Ensure the directory exists
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true });
}

try {
  icons.forEach(icon => {
    const filePath = path.join(imgDir, icon.name);
    createIcon(icon.size, purpleColor, filePath);
  });
  
  console.log('All icons created successfully!');
} catch (error) {
  console.error('Error creating icons:', error);
  console.log('Falling back to simpler method...');
  
  // If canvas fails, create a simple HTML file that redirects to a data URI
  icons.forEach(icon => {
    const filePath = path.join(imgDir, icon.name);
    const htmlContent = `<html><head><meta http-equiv="refresh" content="0;url=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QUZBRDg3RjI5QzBBMTFFMzlBQUNBQzlCQzlCMEFDQzgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QUZBRDg3RjM5QzBBMTFFMzlBQUNBQzlCQzlCMEFDQzgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBRkFEODdGMDlDMEExMUUzOUFBQ0FDOUJDOUIwQUNDOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBRkFEODdGMTlDMEExMUUzOUFBQ0FDOUJDOUIwQUNDOCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PjKJFeQAAAGASURBVHjalFM9a8JQFL0vUfDDIFJ1EOzgUAQh4OQo2Kl/oEtXwVVXRwcR3QQnJ0EUdHcSdHMRdfEHFEQcpJOgBBxEEEUUNDneCzG+RGsOfHnv3pN77ss9lxhj5Lc4HI7E0dGRvbGxsUP8rFarfa1UKhWqgmEYRBRFqlarxc1m8xOMHSqVyvvT09NzJvtL3G53ZGlpaQ/wBrAMGAEWAd+AQ8CuTqezU6vVTobDYQITj7Tb7Zher28CR6yiKFtjQWZouVxmwul0Hnc6nQyg0e12KxaLJeL1eh+DwWCQYL3f7+cgzBsRi8Xkfr/PgUqlkgqFQjGLxbIEWABMAxzAOGAC5nGeCnEqlYrA9EAgQM1m8+3j4yOHxCwZa7XaJ8EKQyAVi8UoRJIVBSLz+XwUiVGpVHLpdDrJY3KZTCYDhULhHES3kUjkHB1ktVoNx+PxdyQwxclkkrTbbZLP5wmIECRgt9sJRLGEQiF5OBwmut0uHYn5fP4QiT8j4XA4HwwGP/4KMADd3TL7pCJfRAAAAABJRU5ErkJggg=="></head><body></body></html>`;
    fs.writeFileSync(filePath, htmlContent);
    console.log(`Created fallback HTML for ${icon.name}`);
  });
} 