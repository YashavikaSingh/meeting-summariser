# AI Meeting Summarizer

An AI-powered application that summarizes meeting transcripts, stores them in a vector database, and allows for semantic search and retrieval of past meetings.

## Features

- Upload meeting transcripts in text format
- Generate AI-powered summaries using Google's Gemini model
- Store meeting transcripts and summaries in a vector database (Pinecone)
- Email summaries to meeting participants
- Chat with AI about specific meeting content
- Search and retrieve past meetings
- Containerized for easy deployment

## Architecture

The application consists of:

1. **Frontend**: React application with Material UI
2. **Backend**: FastAPI server with Google Gemini integration
3. **Vector Database**: Pinecone for storing and retrieving meeting transcripts and summaries

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

## License

This project is licensed under the MIT License. 