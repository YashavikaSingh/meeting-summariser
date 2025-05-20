# Meeting Summarizer Backend

This directory contains the backend components of the Meeting Summarizer application, which uses RAG (Retrieval-Augmented Generation) to process and analyze meeting transcripts.

## Components

- **api.py**: Flask API endpoints for meeting data retrieval and chat functionality
- **app.py**: Main application with background processing thread
- **demo.py**: Demo script to demonstrate the RAG capabilities
- **load_json_to_pinecone.py**: Script to load meeting data from JSON to Pinecone
- **load_test_data.py**: Script to load test data from the testdata directory
- **process_transcripts.py**: Script to process meeting transcripts and generate summaries
- **test_setup.py**: Script to check the system setup
- **vector_db.py**: Interface to Pinecone vector database

## Setup

1. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file with the following contents:
   ```
   PINECONE_API_KEY=your_pinecone_api_key
   GOOGLE_API_KEY=your_google_api_key
   ```

3. Check your system setup:
   ```bash
   python test_setup.py
   ```

## Using the API

Start the Flask API server:
```bash
python app.py
```

The API server will start on port 5000 and begin processing any unprocessed meeting transcripts.

## Loading Meeting Data

### From JSON
If you have meeting data in JSON format, you can load it into Pinecone using:
```bash
python load_json_to_pinecone.py --json_file processed_meetings.json
```

### From Test Data
You can load the test data files:
```bash
python load_test_data.py
```

### From the API
You can also upload meeting transcripts through the API endpoints.

## Demo

The demo.py script demonstrates the RAG capabilities:

```bash
# Upload a transcript
python demo.py --transcript ../testdata/product_strategy_meeting.txt

# Process a meeting
python demo.py --meeting-id <meeting_id>

# Search for information
python demo.py --search "What action items were mentioned in the meeting?"
```

## API Endpoints

- `GET /api/meetings`: List all meetings
- `GET /api/meetings/<meeting_id>`: Get details for a specific meeting
- `GET /api/meetings/search?q=<query>`: Search meetings by semantic similarity
- `POST /api/process`: Process all unprocessed meetings
- `POST /api/process/<meeting_id>`: Process a specific meeting
- `POST /api/chat`: Chat with the AI about meeting content

## Pinecone Setup

Make sure you have created a Pinecone index with the following configuration:
- Name: meeting-summarizer
- Dimensions: 768 (for Gemini embeddings)
- Metric: cosine
- Server type: index type of your choice (s1/p1/p2)

## Troubleshooting

If you encounter issues, run the test_setup.py script to check your system setup:
```bash
python test_setup.py
```

For more detailed troubleshooting steps, see the main README.md file. 