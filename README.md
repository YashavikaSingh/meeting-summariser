# AI Meeting Summarizer

An AI-powered application that summarizes meeting transcripts, stores them in a vector database, and allows for semantic search and retrieval of past meetings.

## Features

- **Enhanced Meeting Summaries**: Automatically generates concise summaries with action items, key topics, and decisions
- **Vector Search**: Find relevant meetings based on semantic similarity to your query
- **AI Chat Interface**: Ask questions about meetings and get answers based on the meeting content
- **Structured Data**: Extract actionable information like action items, key decisions, and next steps
- **Customizable Views**: Focus on what matters to you across multiple meetings
- Search and retrieve past meetings
- Containerized for easy deployment

## System Architecture

The system consists of two main components:

### Backend (Python/FastAPI)
- Processes meeting transcripts using Google's Gemini LLM
- Stores meeting data and embeddings in Pinecone vector database
- Provides API endpoints for frontend queries and chat functionality
- Performs background processing of meeting data

### Frontend (React/TypeScript)
- Displays meeting summaries and structured information
- Provides a search interface for finding relevant meetings
- Includes an AI chat interface for asking questions about meetings
- Allows file uploads for new meeting transcripts

## Prerequisites

- Docker and Docker Compose
- Google Gemini API key
- Pinecone API key
- Gmail account with app password (for sending emails)

## Setup

1. Clone the repository
2. Create a `.env` file in the root directory with the following variables:

```
# Google Gemini API key for summarization and embeddings
GOOGLE_API_KEY=your_google_api_key_here

# Pinecone API key for vector database
PINECONE_API_KEY=your_pinecone_api_key_here

# Gmail credentials for sending emails
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password_here
```

3. Build and start the containers:

```bash
docker-compose up -d
```

4. Access the application at http://localhost

## Usage

1. Enter meeting name and recipient emails
2. Upload a meeting transcript in text format
3. Generate a summary
4. Optionally email the summary to participants
5. View past meetings in the sidebar
6. Chat with AI to ask questions about specific meetings

## Development

### Frontend

The frontend is built with:
- React
- TypeScript
- Material UI
- Vite

To run the frontend in development mode:

```bash
cd frontend
npm install
npm run dev
```

### Backend

The backend is built with:
- FastAPI
- Google Generative AI (Gemini)
- Pinecone for vector storage

To run the backend in development mode:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 3000
```

## Testing

Sample meeting transcripts are available in the `testdata` directory for testing the application.

## API Documentation

The backend provides API documentation via Swagger UI, which can be accessed at:
- http://localhost:3000/docs - Swagger UI
- http://localhost:3000/redoc - ReDoc (alternative documentation)

These interactive documentation pages allow you to explore and test the API endpoints.

## API Endpoints

The backend provides several API endpoints:

- `GET /api/meetings` - List all meetings
- `GET /api/meetings/{meeting_id}` - Get details for a specific meeting
- `GET /api/meetings/search` - Search meetings by semantic similarity
- `POST /api/process` - Process all unprocessed meetings
- `POST /api/process/{meeting_id}` - Process a specific meeting
- `POST /api/chat` - Chat with the AI about meeting content
- `DELETE /api/meetings/{meeting_id}` - Delete a specific meeting

## Troubleshooting

### Docker Issues
- Make sure Docker is running on your system
- Check container logs using `docker-compose logs`
- Ensure the `.env` file is properly configured with all required API keys
- If you see a white screen when accessing the app, try visiting http://localhost/test.html to test the API connection or clear your browser cache

### Pinecone Connection Issues
- Verify that your Pinecone API key is correct
- Ensure the index name matches exactly ("meeting-summarizer")
- Check that your Pinecone service is active

### Google API Issues
- Confirm your Google API key has access to the Gemini models
- Ensure you're using the correct API version (2023-12-01)
- Verify that your Google API key has sufficient quota

## License

[MIT License](LICENSE) 