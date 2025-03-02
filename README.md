# TuneYourPrompt

A mobile-optimized website designed to teach people how to craft effective AI prompts using the Metis model.

## Overview

TuneYourPrompt is a lightweight, accessible tool for anyone to learn prompting on the go—no app download needed, just a browser. It provides a three-step workflow to help users improve their AI prompting skills:

1. **Define Your Goal** - Users specify their expected output
2. **Write Your Prompt** - Users craft a prompt to achieve that output
3. **Get Feedback** - The site evaluates the AI's response and provides improvement tips

## Features

- **Scoring System**: Match percentage showing how close the AI output is to the expected result
- **Feedback Breakdown**: Analysis of clarity, detail, and relevance
- **AI-Driven Suggestions**: Recommendations for better prompts
- **Mobile-First Design**: Clean, simple interface optimized for small screens
- **Modern UI**: Dark theme with futuristic design elements

## Technical Setup

- **Backend**: Node.js Express server connecting to an AI API
- **Evaluation**: Uses text-similarity metrics and rule-based checks
- **Frontend**: Lightweight HTML/CSS/JS responsive site

## Getting Started

1. Clone this repository
2. Install dependencies with `npm install`
3. Start the server with `npm start`
4. Access the website at `http://localhost:3000`

## Environment Variables

Create a `.env` file with the following variables:

```
PORT=3000
OLLAMA_API_URL=https://ai.mailbyai.site
USE_MOCK_DATA=false
```

Set `USE_MOCK_DATA=true` if you want to use simulated AI responses for testing.

## Deployment to Vercel

This application is ready to be deployed to Vercel:

1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy

Alternatively, you can connect your GitHub repository to Vercel for automatic deployments:

1. Push your code to GitHub
2. Create a new project in Vercel
3. Import your GitHub repository
4. Vercel will automatically detect the configuration and deploy your app

The environment variables are already configured in the `vercel.json` file.

## License

This project is open source and available under the MIT license. 