#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from pinecone import Pinecone
from dotenv import load_dotenv
import argparse
import json

# Load environment variables
load_dotenv()

# Constants
INDEX_NAME = "meeting-summarizer"
NAMESPACE = "meetings"

def check_index(namespace=NAMESPACE, limit=100):
    """
    Check the Pinecone index and list all vectors.
    
    Args:
        namespace (str): Namespace to check
        limit (int): Maximum number of vectors to list
    """
    # Get Pinecone API key from environment variables
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")
    
    # Initialize Pinecone with v6.0.0 API
    print(f"Connecting to Pinecone using v6.0.0 API...")
    pc = Pinecone(api_key=api_key)
    
    try:
        # Connect to the index
        index = pc.Index(INDEX_NAME)
        
        # Get index stats
        stats = index.describe_index_stats()
        print(f"\nIndex Statistics:")
        print(f"Total vector count: {stats['total_vector_count']}")
        print(f"Namespaces: {stats['namespaces']}")
        
        if stats['total_vector_count'] == 0:
            print("\nNo vectors found in the index.")
            return
        
        # List vectors in the namespace using query
        print(f"\nQuerying vectors in namespace '{namespace}':")
        
        # Create a dummy vector for query (all zeros)
        dummy_vector = [0.0] * 768  # Use the dimension of your index
        
        # Query with high top_k to get all vectors
        query_response = index.query(
            vector=dummy_vector,
            top_k=limit,
            namespace=namespace,
            include_metadata=True
        )
        
        if not query_response.matches:
            print(f"No vectors found in namespace '{namespace}'.")
            return
        
        # Print vector information
        for i, match in enumerate(query_response.matches):
            print(f"\nVector {i+1}:")
            print(f"ID: {match.id}")
            print(f"Score: {match.score}")
            print(f"Metadata:")
            
            # Print important metadata fields
            if match.metadata:
                print(f"  Meeting Name: {match.metadata.get('meeting_name', 'N/A')}")
                print(f"  Meeting Date: {match.metadata.get('meeting_date', 'N/A')}")
                print(f"  Attendees: {match.metadata.get('attendees', 'N/A')}")
                
                # Print summary if available
                if 'summary' in match.metadata:
                    summary = match.metadata['summary']
                    print(f"  Summary: {summary[:200]}..." if len(summary) > 200 else f"  Summary: {summary}")
        
        print(f"\nTotal: {len(query_response.matches)} vectors listed")
        
    except Exception as e:
        print(f"Error: {e}")

def main():
    parser = argparse.ArgumentParser(description='Check Pinecone index and list vectors')
    parser.add_argument('--namespace', type=str, default=NAMESPACE, 
                        help='Namespace to check')
    parser.add_argument('--limit', type=int, default=100, 
                        help='Maximum number of vectors to list')
    
    args = parser.parse_args()
    
    check_index(args.namespace, args.limit)

if __name__ == "__main__":
    main() 