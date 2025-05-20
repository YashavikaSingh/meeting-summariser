# Pinecone Index Setup for Meeting Summarizer

This guide explains how to set up a Pinecone vector database index with the exact configuration requested for the Meeting Summarizer application.

## Configuration Parameters

The Meeting Summarizer requires a Pinecone index with the following specifications:

- **Index Name**: `meeting-summarizer`
- **Vector Type**: Dense
- **Dimensions**: 768
- **Metric**: Cosine
- **Capacity Mode**: Serverless
- **Cloud**: AWS
- **Region**: US-EAST-1

## Account Setup

Before you can create the index, make sure you have:

1. A Pinecone account with appropriate permissions to create indexes
2. Your Pinecone API key available

If you're encountering the "max pods allowed" error, you need to:
1. Log in to your Pinecone account at https://app.pinecone.io/
2. Go to the "Billing & Usage" section
3. Upgrade your account or contact Pinecone support to increase your index quota

## Setup Methods

### Method 1: Using the Pinecone Dashboard (Recommended)

1. Log in to the [Pinecone Dashboard](https://app.pinecone.io/)
2. Click "Create Index"
3. Enter the following details:
   - **Name**: meeting-summarizer
   - **Dimensions**: 768
   - **Metric**: Cosine
   - **Capacity Mode**: Serverless
   - **Cloud Provider**: AWS
   - **Region**: us-east-1

### Method 2: Using the Python SDK (v2.2.4)

The Python script `setup_meeting_index.py` in this directory contains the code to create the index with the specified configuration.

```python
import os
import pinecone
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Pinecone configuration constants
INDEX_NAME = "meeting-summarizer"
DIMENSION = 768
METRIC = "cosine"
ENVIRONMENT = "us-east-1-aws"

# Get Pinecone API key
api_key = os.getenv('PINECONE_API_KEY')
if not api_key:
    raise ValueError("PINECONE_API_KEY environment variable is not set")

# Initialize Pinecone client
pinecone.init(api_key=api_key, environment=ENVIRONMENT)

# Create the index using Pinecone v2.2.4 API
pinecone.create_index(
    name=INDEX_NAME,
    dimension=DIMENSION,
    metric=METRIC
)

# Wait for the index to be ready
time.sleep(20)

# Connect to the new index
index = pinecone.Index(INDEX_NAME)
print(f"Successfully created index '{INDEX_NAME}'")
```

**Note**: With Pinecone version 2.2.4, the serverless setup is inferred automatically based on account configuration.

## Checking If the Index Exists

To check if the index already exists and get its information:

```python
import pinecone
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Pinecone API key
api_key = os.getenv('PINECONE_API_KEY')

# Initialize Pinecone
pinecone.init(api_key=api_key, environment="us-east-1-aws")

# List all indexes
indexes = pinecone.list_indexes()
print(f"Existing indexes: {indexes}")

# Check if our index exists
if "meeting-summarizer" in indexes:
    # Connect to the index
    index = pinecone.Index("meeting-summarizer")
    
    # Get index stats
    stats = index.describe_index_stats()
    print(f"Index stats: {stats}")
```

## Using the Index in the Application

Once the index is created, you can use it in your application as follows:

```python
import pinecone
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Initialize Pinecone and connect to the index
pinecone.init(api_key=os.getenv('PINECONE_API_KEY'), environment="us-east-1-aws")
index = pinecone.Index("meeting-summarizer")

# Initialize Gemini for embeddings
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = genai.GenerativeModel('embedding-001')

# Example: Generate embedding for a meeting transcript
def get_embedding(text):
    result = model.embed_content(text)
    return result.embedding

# Example: Store a meeting in the vector database
def store_meeting(meeting_id, transcript, meeting_name, date, attendees):
    # Generate embedding for the transcript
    embedding = get_embedding(transcript)
    
    # Store in Pinecone with metadata
    index.upsert(
        vectors=[(meeting_id, embedding, {
            "meeting_name": meeting_name,
            "meeting_date": date,
            "attendees": attendees,
            "transcript": transcript
        })],
        namespace="meetings"
    )
    
    return {"status": "success", "message": f"Meeting {meeting_id} stored successfully"}
```

## Troubleshooting

If you encounter the "max pods allowed" error:
- Check your Pinecone account type and limits
- Consider upgrading to a paid plan if using the free tier
- Contact Pinecone support if you need assistance with account limits

For API version compatibility issues:
- Check your installed Pinecone version with `python -c "import pinecone; print(pinecone.__version__)"`
- Refer to the [Pinecone documentation](https://docs.pinecone.io/) for your specific version 