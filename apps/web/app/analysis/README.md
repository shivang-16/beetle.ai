# Code Analysis Feature

This directory contains the code analysis functionality for the CodeDetector web application.

## Features

- **Real-time Streaming**: Live output streaming from the analysis API
- **Markdown Rendering**: Support for markdown content in analysis results
- **Syntax Highlighting**: Code blocks are highlighted with proper syntax
- **Dark Mode Support**: Full dark mode compatibility
- **Responsive Design**: Works on desktop and mobile devices

## Components

### AnalysisForm
- Configuration form for repository URL, AI model, and analysis prompt
- Quick preset buttons for common analysis types
- Start/Stop analysis controls

### AnalysisOutput
- Real-time streaming output display
- Color-coded output based on content type
- Markdown and syntax highlighting support
- Auto-scrolling to latest output

### AnalysisStatus
- Current analysis status indicator
- Output line count
- Connection status

## API Integration

The analysis feature integrates with the backend API at `http://localhost:3001/api/analysis/execute`:

- **Method**: POST
- **Content-Type**: application/json
- **Body**: 
  ```json
  {
    "repoUrl": "https://github.com/user/repo",
    "model": "gemini-2.5-flash",
    "prompt": "Analysis prompt"
  }
  ```
- **Response**: Streaming text/plain response

## Usage

1. Navigate to `/analysis` in the web application
2. Configure the analysis parameters:
   - Repository URL
   - AI Model selection
   - Analysis prompt
3. Click "Start Analysis" to begin
4. Monitor real-time output in the terminal-style display
5. Use "Stop Analysis" to cancel if needed

## Styling

The components use Tailwind CSS with:
- Dark mode support
- Custom scrollbars
- Responsive grid layouts
- Consistent color scheme
- Smooth animations and transitions