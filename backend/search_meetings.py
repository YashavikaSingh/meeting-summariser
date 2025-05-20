#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import argparse
from pinecone import Pinecone
from dotenv import load_dotenv
import hashlib
import numpy as np

# Load environment variables
load_dotenv()

# Constants
INDEX_NAME = "meeting-summarizer"
DIMENSION = 768
NAMESPACE = "meetings"

def setup_pinecone():
    """
    Connect to Pinecone and return the index.
    """
    # Get Pinecone API key from environment variables
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")
    
    # Initialize Pinecone with v6.0.0 API
    pc = Pinecone(api_key=api_key)
    
    # Connect to the index
    index = pc.Index(INDEX_NAME)
    
    return index

def get_mock_embedding(text):
    """
    Generate a mock embedding for text (same as in load_json_to_pinecone.py).
    
    Args:
        text (str): The text to generate embedding for
    
    Returns:
        list: The embedding vector
    """
    # Create a hash of the text
    hash_obj = hashlib.sha256(text.encode())
    hash_bytes = hash_obj.digest()
    
    # Convert hash bytes to a vector of floats with the required dimension
    vector = []
    for i in range(DIMENSION):
        # Use modulo to cycle through the hash bytes
        byte_index = i % len(hash_bytes)
        # Convert byte to float between -1 and 1
        vector.append((hash_bytes[byte_index] / 128.0) - 1.0)
    
    # Normalize the vector to unit length
    vector = np.array(vector)
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    
    return vector.tolist()

def search_meetings(query_text, top_k=3, namespace=NAMESPACE):
    """
    Search for meetings related to the query text.
    
    Args:
        query_text (str): The query text
        top_k (int): Maximum number of results to return
        namespace (str): Namespace to search in
    
    Returns:
        list: List of matching meetings
    """
    # Connect to Pinecone
    index = setup_pinecone()
    
    # Generate embedding for the query
    query_embedding = get_mock_embedding(query_text)
    
    # Query Pinecone index
    query_response = index.query(
        vector=query_embedding,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True
    )
    
    return query_response.matches

def display_meeting_results(results):
    """
    Display meeting search results in a readable format.
    
    Args:
        results (list): List of query matches
    """
    if not results:
        print("No matching meetings found.")
        return
    
    print(f"\nFound {len(results)} matching meetings:\n")
    
    for i, match in enumerate(results):
        print(f"Result {i+1} (Score: {match.score:.4f}):")
        print(f"  Meeting ID: {match.id}")
        
        if match.metadata:
            print(f"  Meeting Name: {match.metadata.get('meeting_name', 'N/A')}")
            print(f"  Meeting Date: {match.metadata.get('meeting_date', 'N/A')}")
            
            attendees = match.metadata.get('attendees', [])
            if attendees:
                if isinstance(attendees, list):
                    print(f"  Attendees: {', '.join(attendees[:3])}")
                    if len(attendees) > 3:
                        print(f"    and {len(attendees) - 3} more...")
                else:
                    print(f"  Attendees: {attendees}")
            
            if 'summary' in match.metadata:
                summary = match.metadata['summary']
                print(f"  Summary Preview: {summary[:200]}..." if len(summary) > 200 else f"  Summary: {summary}")
        
        print()

def main():
    parser = argparse.ArgumentParser(description='Search for meetings in the vector database')
    parser.add_argument('query', type=str, help='Query text to search for')
    parser.add_argument('--top_k', type=int, default=3, help='Maximum number of results to return')
    parser.add_argument('--namespace', type=str, default=NAMESPACE, help='Namespace to search in')
    
    args = parser.parse_args()
    
    print(f"Searching for meetings related to: '{args.query}'")
    print(f"Using mock embeddings for demonstration purposes")
    
    # Search for meetings
    results = search_meetings(args.query, args.top_k, args.namespace)
    
    # Display results
    display_meeting_results(results)

if __name__ == "__main__":
    main() 