# Pinecone Vector Database Setup for Meeting Summarizer

This directory contains scripts and guides for setting up and using Pinecone vector database with the Meeting Summarizer application.

## Overview

The Meeting Summarizer application uses Pinecone vector database to store and retrieve meeting transcripts, summaries, and metadata. This allows for efficient semantic search and retrieval of meeting content.

## Files and Scripts

- **PINECONE_INDEX_SETUP.md**: Detailed guide on how to set up the Pinecone index with the exact configuration required
- **check_pinecone_indexes.py**: Script to check Pinecone connection and list available indexes
- **setup_meeting_index.py**: Script to create the Pinecone index with the required configuration
- **load_json_to_pinecone.py**: Script to load meeting data from JSON into Pinecone
- **load_test_data.py**: Script to generate test meeting data from transcript files
- **vector_db.py**: Module for interacting with the Pinecone vector database in the application

## Quick Start Guide

### Step 1: Check Prerequisites

- Make sure you have a Pinecone account and API key
- Ensure the Google Gemini API key is set up for generating embeddings
- Add your API keys to the `.env` file:
  ```
  PINECONE_API_KEY=your_pinecone_api_key
  GOOGLE_API_KEY=your_google_api_key
  ```

### Step 2: Check Pinecone Connection

Run the following command to check your Pinecone connection and list available indexes:

```bash
conda activate ragai
python check_pinecone_indexes.py
```

This script will:
- Test the connection to Pinecone
- List any existing indexes
- Provide next steps based on the results

### Step 3: Create the Pinecone Index

You have two options to create the index:

#### Option A: Using the Pinecone Dashboard (Recommended)

1. Log in to the [Pinecone Dashboard](https://app.pinecone.io/)
2. Click "Create Index"
3. Enter the following details:
   - **Name**: meeting-summarizer
   - **Dimensions**: 768
   - **Metric**: Cosine
   - **Capacity Mode**: Serverless
   - **Cloud Provider**: AWS
   - **Region**: us-east-1

#### Option B: Using the Setup Script

If your account allows creating indexes via API, you can run:

```bash
conda activate ragai
python setup_meeting_index.py
```

### Step 4: Generate Test Data

Generate test meeting data from the transcript files:

```bash
conda activate ragai
python load_test_data.py
```

This creates a `processed_meetings.json` file with meeting data extracted from transcript files.

### Step 5: Verify the Index

Check if the Pinecone index exists and is properly configured:

```bash
conda activate ragai
python load_json_to_pinecone.py --check_only
```

### Step 6: Upload Data to Pinecone

Upload the processed meeting data to Pinecone:

```bash
conda activate ragai
python load_json_to_pinecone.py --json_file processed_meetings.json
```

## Configuration Parameters

The Meeting Summarizer requires a Pinecone index with the following specifications:

- **Index Name**: `meeting-summarizer`
- **Vector Type**: Dense
- **Dimensions**: 768
- **Metric**: Cosine
- **Capacity Mode**: Serverless
- **Cloud**: AWS
- **Region**: US-EAST-1

## Troubleshooting

### Account Limits

If you encounter errors about reaching max pods allowed:
- This is a limitation of your Pinecone account tier
- Consider upgrading your account or contacting Pinecone support

### Connection Issues

If you have trouble connecting to Pinecone:
- Check that your API key is correct
- Try different environment values in the scripts
- Ensure your account has the necessary permissions

### API Version Compatibility

If you encounter API compatibility issues:
- Check your Pinecone SDK version with `python -c "import pinecone; print(pinecone.__version__)"`
- Adjust the scripts as needed based on the API version

## Using Pinecone in the Application

Once set up, the Meeting Summarizer application will:
1. Store meeting transcripts and summaries as vectors in Pinecone
2. Retrieve similar meetings via semantic search
3. Enable AI-powered analysis of meeting content
4. Provide fast and relevant access to past meeting information

For more detailed information, refer to the vector_db.py module and the main application documentation. 