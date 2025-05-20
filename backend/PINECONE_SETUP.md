# Pinecone Setup Guide

This document explains how to set up Pinecone for the Meeting Summarizer application and how to load meeting data into it.

## Prerequisites

1. A Pinecone account (create one at [pinecone.io](https://www.pinecone.io/) if you don't have one)
2. Your Pinecone API key
3. Python environment with the required packages installed (see requirements.txt)

## Setting Up Pinecone

1. Sign in to the Pinecone Console: [console.pinecone.io](https://console.pinecone.io/)
2. Create a new index with the following configuration:
   - Name: `meeting-summarizer`
   - Dimensions: `768` (this should match the DIMENSION value in vector_db.py)
   - Metric: `cosine`
   - Pod Type: `p1.x1` for production or `s1.x1` for development (or choose based on your needs)

## Adding Your API Key

1. Create a `.env` file in the `backend` directory if it doesn't exist
2. Add your Pinecone API key:

```
PINECONE_API_KEY=your_pinecone_api_key_here
GOOGLE_API_KEY=your_google_api_key_here  # For using actual Gemini embeddings
```

## Loading Meeting Data to Pinecone

### Using the JSON Loader Script

To load meeting data from a JSON file to Pinecone:

```bash
python load_json_to_pinecone.py --json_file processed_meetings.json
```

Options:
- `--json_file`: Path to the JSON file (default: processed_meetings.json)
- `--namespace`: Namespace to upload to (default: meetings)
- `--batch_size`: Number of records to upload in each batch (default: 10)
- `--check_only`: Only check if the index exists, don't upload data

### Using the Demo Script

To upload a single meeting transcript, process it, and then query it:

```bash
python demo.py --transcript_file path/to/transcript.txt --upload
```

## Checking the Pinecone Index

To check the status of your Pinecone index and list stored vectors:

```bash
python check_index.py
```

Options:
- `--namespace`: Namespace to check (default: meetings)
- `--limit`: Maximum number of vectors to list (default: 100)

## Embeddings

The current implementation uses mock embeddings for testing purposes. For production use, you should:

1. Implement proper embeddings using a trusted embedding model
2. Update the `get_embedding` function in both `vector_db.py` and `load_json_to_pinecone.py`

### Using Real Embeddings

To use Google's Gemini API for generating real embeddings for production:

1. Make sure you have a valid Google API key with access to Gemini
2. Set the `GOOGLE_API_KEY` environment variable
3. Update the `get_embedding` function to use a proper embedding model:

```python
def get_embedding(text, model):
    """Generate embedding for text using a proper embedding model"""
    response = model.generate_content(text)
    # Extract and return embedding based on the API response structure
    return response.embedding  # Adjust based on actual API response
```

## Troubleshooting

- **"No IDs provided for fetch query"**: This error occurs when trying to fetch vectors without providing IDs. Use query instead of fetch to retrieve vectors.
- **API Rate Limits**: If you hit rate limits with the embedding API, consider implementing a retry mechanism with exponential backoff.
- **Dimension Mismatch**: Ensure the vector dimension in your code matches the dimension of your Pinecone index. 