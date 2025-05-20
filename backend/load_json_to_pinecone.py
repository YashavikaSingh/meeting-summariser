#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 16:30:05
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 12:49:43

import os
import json
from pinecone import Pinecone
from dotenv import load_dotenv
import google.generativeai as genai
import time
import argparse

# Load environment variables
load_dotenv()

# Pinecone configuration constants
INDEX_NAME = "meeting-summarizer"  # Index name as provided
DIMENSION = 768  # Vector dimension as specified
NAMESPACE = "meetings"  # Default namespace

def check_pinecone_index():
    """
    Check if the Pinecone index exists and is properly configured.
    
    Returns:
        tuple: (index_exists, index_object)
    """
    # Get Pinecone API key from environment variables
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")
    
    # Initialize Pinecone with v6.0.0 API
    print(f"Connecting to Pinecone using v6.0.0 API...")
    pc = Pinecone(api_key=api_key)
    
    try:
        # List indexes to check if the index exists
        indexes = pc.list_indexes()
        index_names = [index.name for index in indexes]
        
        if INDEX_NAME not in index_names:
            print(f"❌ Index '{INDEX_NAME}' does not exist!")
            print(f"Please create the index first using the Pinecone dashboard.")
            print(f"Refer to PINECONE_INDEX_SETUP.md for instructions.")
            return False, None
        
        # Connect to the index
        index = pc.Index(INDEX_NAME)
        
        # Get index stats to verify configuration
        try:
            stats = index.describe_index_stats()
            print(f"✅ Successfully connected to index '{INDEX_NAME}'")
            print(f"Index stats: {stats}")
            
            return True, index
        except Exception as e:
            print(f"❌ Error getting index stats: {e}")
            return False, None
    except Exception as e:
        print(f"❌ Error connecting to Pinecone: {e}")
        return False, None

def setup_gemini():
    """
    Setup mock embedding for testing.
    No actual Gemini API call will be made.
    """
    print("Setting up mock embeddings (no API calls)")
    # Return None as we don't actually need a model
    return None

def get_embedding(text, model):
    """
    Generate mock embedding for text for testing purposes.
    This function generates consistent embeddings based on the text content
    without actually calling the Gemini API.
    
    Args:
        text (str): The text to generate embedding for
        model: Ignored, kept for compatibility
    
    Returns:
        list: The embedding vector
    """
    try:
        import hashlib
        import numpy as np
        
        # Create a hash of the text to ensure the same text always produces the same vector
        hash_obj = hashlib.sha256(text.encode())
        hash_bytes = hash_obj.digest()
        
        # Convert hash bytes to a vector of floats with the required dimension
        vector = []
        for i in range(DIMENSION):
            # Use modulo to cycle through the hash bytes
            byte_index = i % len(hash_bytes)
            # Convert byte to float between -1 and 1
            vector.append((hash_bytes[byte_index] / 128.0) - 1.0)
        
        # Normalize the vector to unit length (important for cosine similarity)
        vector = np.array(vector)
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        
        print(f"Generated mock embedding for text of length {len(text)} characters")
        return vector.tolist()
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise

def load_json_data(json_file):
    """
    Load meeting data from JSON file.
    
    Args:
        json_file (str): Path to the JSON file
    
    Returns:
        list: List of meeting records
    """
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(f"Error loading JSON file: {e}")
        raise

def upload_to_pinecone(index, data, embedding_model, batch_size=10, namespace=NAMESPACE):
    """
    Upload meeting data to Pinecone index.
    
    Args:
        index: The Pinecone index object
        data (list): List of meeting records
        embedding_model: The Gemini model for generating embeddings
        batch_size (int): Number of records to upload in each batch
        namespace (str): Namespace to upload to
    """
    # Process in batches
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        vectors = []
        
        print(f"Processing batch {i//batch_size + 1}/{len(data)//batch_size + 1}...")
        
        for record in batch:
            # Generate embedding for each record
            # We can combine transcript and summary for a more comprehensive embedding
            content = record["transcript"]
            if "summary" in record:
                content += " " + record["summary"]
            
            embedding = get_embedding(content, embedding_model)
            
            # Prepare metadata
            metadata = {
                "meeting_name": record["meeting_name"],
                "transcript": record["transcript"],
                "timestamp": record["timestamp"],
                "attendees": record["attendees"],
                "meeting_date": record["meeting_date"]
            }
            
            # Add summary if available
            if "summary" in record:
                metadata["summary"] = record["summary"]
            
            # Add to vectors batch using v6.0.0 API format
            vectors.append({
                "id": record["meeting_id"],
                "values": embedding,
                "metadata": metadata
            })
        
        # Upsert the batch using v6.0.0 API format
        index.upsert(vectors=vectors, namespace=namespace)
        print(f"✅ Uploaded batch {i//batch_size + 1}/{len(data)//batch_size + 1}")
        
        # Slight delay to avoid rate limiting
        time.sleep(1)

def main():
    parser = argparse.ArgumentParser(description='Load meeting data from JSON to Pinecone vector database')
    parser.add_argument('--json_file', type=str, default='processed_meetings.json', 
                        help='Path to the JSON file containing meeting data')
    parser.add_argument('--namespace', type=str, default=NAMESPACE, 
                        help='Namespace to upload data to')
    parser.add_argument('--batch_size', type=int, default=10, 
                        help='Number of records to upload in each batch')
    parser.add_argument('--check_only', action='store_true',
                        help='Only check if the index exists, don\'t upload data')
    parser.add_argument('--mock_embeddings', action='store_true', default=True,
                        help='Use mock embeddings instead of actual API calls (default: True)')
    
    args = parser.parse_args()
    
    # Check if the Pinecone index exists
    print("Checking Pinecone index...")
    index_exists, index = check_pinecone_index()
    
    if not index_exists:
        print("\nThe index doesn't exist or there was an error connecting to it.")
        print("Please create the index first using the Pinecone dashboard.")
        print("Refer to PINECONE_INDEX_SETUP.md for detailed instructions.")
        return
    
    if args.check_only:
        print("\n✅ Index check complete. The index exists and is ready to use.")
        return
    
    # Setup embedding model
    print("\nSetting up embeddings...")
    if args.mock_embeddings:
        print("NOTICE: Using mock embeddings for testing. These are not real semantic embeddings.")
        print("For production use, implement a proper embedding function.")
    embedding_model = setup_gemini()
    
    # Load JSON data
    print(f"\nLoading meeting data from {args.json_file}...")
    data = load_json_data(args.json_file)
    print(f"Loaded {len(data)} meeting records")
    
    # Upload to Pinecone
    print(f"\nUploading data to Pinecone namespace: {args.namespace}...")
    upload_to_pinecone(index, data, embedding_model, args.batch_size, args.namespace)
    
    print("\n✅ Data upload complete!")
    
    # Get and display stats
    stats = index.describe_index_stats()
    print("\nIndex Statistics:")
    print(f"Total vector count: {stats['total_vector_count']}")
    print(f"Namespaces: {stats['namespaces']}")
    
    print("\nNext steps:")
    print("1. Use the vector_db.py module to perform semantic searches on your meetings")
    print("2. Update the frontend to display meeting data from Pinecone")
    print("3. Implement real-time meeting transcript ingestion")

if __name__ == "__main__":
    main() 