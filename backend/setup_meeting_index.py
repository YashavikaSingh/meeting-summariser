#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 17:30:05
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 12:50:32

import os
import pinecone
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Pinecone configuration constants
INDEX_NAME = "quickstart"  # Index name as specified
DIMENSION = 768  # Vector dimension as specified
METRIC = "cosine"  # Distance metric as specified
ENVIRONMENT = "us-east-1-aws"  # Environment combining region and cloud for version 2.2.4

def setup_meeting_summarizer_index():
    """
    Set up a Pinecone index for the meeting summarizer application with the specified configuration:
    - Index name: meeting-summarizer
    - Vector Type: Dense
    - Dimensions: 768
    - Metric: Cosine
    - Capacity Mode: Serverless (inferred by default in version 2.2.4)
    - Cloud/Region: us-east-1-aws
    """
    # Get Pinecone API key from environment variables
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")
    
    # Initialize Pinecone (for version 2.2.4)
    print("Initializing Pinecone client...")
    pinecone.init(api_key=api_key, environment=ENVIRONMENT)
    
    # Check if index already exists
    existing_indexes = pinecone.list_indexes()
    if INDEX_NAME in existing_indexes:
        print(f"Index '{INDEX_NAME}' already exists. Connecting to existing index.")
        index = pinecone.Index(INDEX_NAME)
        
        # Print index stats
        stats = index.describe_index_stats()
        print(f"Index stats: {stats}")
        
        return index
    
    # Create new index with specified configuration (for version 2.2.4)
    print(f"Creating new index: '{INDEX_NAME}'")
    print(f"Configuration:")
    print(f"  - Vector Type: Dense")
    print(f"  - Dimensions: {DIMENSION}")
    print(f"  - Metric: {METRIC}")
    print(f"  - Environment: {ENVIRONMENT}")
    
    # Create the index using Pinecone v2.2.4 API
    pinecone.create_index(
        name=INDEX_NAME,
        dimension=DIMENSION,
        metric=METRIC
    )
    
    # Wait for the index to be ready
    print("Waiting for index to be ready...")
    time.sleep(20)  # Increased wait time for index initialization
    
    # Connect to the new index
    index = pinecone.Index(INDEX_NAME)
    
    # Print confirmation
    print(f"Successfully created index '{INDEX_NAME}' with the specified configuration")
    
    return index

def get_index_information(index_name):
    """
    Get detailed information about an existing index
    """
    try:
        # Get index information through list_indexes
        indexes = pinecone.list_indexes()
        
        if index_name not in indexes:
            print(f"Index '{index_name}' does not exist")
            return None
        
        # Connect to the index to get stats
        index = pinecone.Index(index_name)
        stats = index.describe_index_stats()
        
        print(f"Index '{index_name}' information:")
        print(f"  - Total vector count: {stats['total_vector_count']}")
        print(f"  - Dimension: {stats['dimension']}")
        print(f"  - Metric: {stats['metric']}")
        
        if 'namespaces' in stats and stats['namespaces']:
            print(f"  - Namespaces: {list(stats['namespaces'].keys())}")
            for ns, ns_stats in stats['namespaces'].items():
                print(f"    - {ns}: {ns_stats['vector_count']} vectors")
        
        return stats
    except Exception as e:
        print(f"Error getting index information: {e}")
        return None

def main():
    # Set up the meeting summarizer index
    try:
        index = setup_meeting_summarizer_index()
        print("\nIndex setup complete!")
        
        # Get and display detailed index information
        get_index_information(INDEX_NAME)
        
    except Exception as e:
        print(f"Error setting up Pinecone index: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 