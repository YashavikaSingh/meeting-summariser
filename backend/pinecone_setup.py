#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 16:45:05
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 16:45:44

import os
import argparse
import pinecone
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

def setup_pinecone_index(api_key, index_name, dimension=768, metric="cosine", 
                         cloud="aws", region="us-east-1", serverless=True,
                         deletion_protection="enabled", pod_type=None, 
                         replicas=None, pods=None, integrated_model=None,
                         metadata_config=None):
    """
    Sets up a Pinecone index with advanced configuration options.
    
    Args:
        api_key (str): Pinecone API key
        index_name (str): Name for the index
        dimension (int): Vector dimension
        metric (str): Distance metric (cosine, euclidean, dotproduct)
        cloud (str): Cloud provider (aws, gcp, azure)
        region (str): Region (e.g., us-east-1)
        serverless (bool): Whether to use serverless or pod-based deployment
        deletion_protection (str): "enabled" or "disabled"
        pod_type (str): For pod-based indexes: s1, p1, p2
        replicas (int): For pod-based indexes: number of replicas
        pods (int): For pod-based indexes: number of pods per replica
        integrated_model (dict): Configuration for integrated embedding
        metadata_config (dict): Configuration for metadata indexing
    
    Returns:
        The created Pinecone index
    """
    # Initialize Pinecone
    pinecone.init(api_key=api_key)
    
    # Check if index already exists
    if index_name in pinecone.list_indexes():
        print(f"Index {index_name} already exists")
        return pinecone.Index(index_name)
    
    # Index creation parameters
    create_params = {
        "name": index_name,
        "dimension": dimension,
        "metric": metric,
    }
    
    # Serverless configuration
    if serverless:
        create_params["spec"] = {
            "serverless": {
                "cloud": cloud,
                "region": region
            }
        }
    # Pod-based configuration
    elif pod_type:
        create_params["spec"] = {
            "pod": {
                "environment": f"{cloud}-{region}",
                "pod_type": pod_type,
                "pods": pods or 1,
                "replicas": replicas or 1
            }
        }
    
    # Add metadata config if provided
    if metadata_config:
        create_params["metadata_config"] = metadata_config
    
    # Create the index
    print(f"Creating new Pinecone index: {index_name}")
    
    # For integrated embedding models
    if integrated_model:
        print(f"Creating index with integrated model: {integrated_model['model']}")
        pinecone.create_index_for_model(
            name=index_name,
            cloud=cloud,
            region=region,
            embed=integrated_model
        )
    else:
        pinecone.create_index(**create_params)
    
    # Wait for the index to be ready
    print("Waiting for index to be ready...")
    time.sleep(20)  # Increased wait time for index to be ready
    
    # Set deletion protection if needed
    if deletion_protection == "enabled":
        pinecone.configure_index(
            name=index_name,
            deletion_protection=deletion_protection
        )
    
    # Return the index
    return pinecone.Index(index_name)

def integrated_embedding_example():
    """Example setup with integrated embedding model"""
    # Get Pinecone API key
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")
    
    # Set up index with integrated embedding
    index = setup_pinecone_index(
        api_key=api_key,
        index_name="meetings-integrated",
        dimension=1024,  # Will be set automatically by the model
        serverless=True,
        cloud="aws",
        region="us-east-1",
        integrated_model={
            "model": "llama-text-embed-v2",  # Pinecone's hosted model
            "field_map": {"text": "transcript"}  # Map the text field to transcript
        }
    )
    
    # Example upsert with integrated model
    index.upsert_texts(
        texts=["Meeting transcript example with integrated model"],
        namespace="example-namespace",
        ids=["meeting-1"],
        metadata=[{"meeting_name": "Example Meeting", "date": "2025-05-20"}]
    )
    
    # Example search with integrated model
    results = index.query(
        namespace="example-namespace",
        query={
            "top_k": 1,
            "inputs": {
                "text": "Example meeting"
            }
        }
    )
    
    print("Integrated Embedding Search Results:", results)

def vector_search_example():
    """Example setup with standard vector search"""
    # Get Pinecone API key
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        raise ValueError("PINECONE_API_KEY environment variable is not set")
    
    # Set up index for standard vector search
    index = setup_pinecone_index(
        api_key=api_key,
        index_name="meetings-standard",
        dimension=768,  # Dimension for Gemini embeddings
        serverless=True,
        cloud="aws",
        region="us-east-1",
        # Example metadata config for optimized filtering
        metadata_config={
            "indexed": ["meeting_date", "attendees"]  # Fields to optimize for filtering
        }
    )
    
    # Example vector upsert
    dummy_vector = [0.1] * 768  # Replace with real embeddings
    
    index.upsert(
        vectors=[
            ("meeting-1", dummy_vector, {
                "meeting_name": "Budget Review",
                "meeting_date": "2025-05-20",
                "attendees": ["john@example.com"]
            })
        ],
        namespace="example-namespace"
    )
    
    # Example vector search with metadata filtering
    results = index.query(
        vector=dummy_vector,
        namespace="example-namespace",
        top_k=1,
        filter={
            "meeting_date": {"$eq": "2025-05-20"}
        }
    )
    
    print("Vector Search Results:", results)

def main():
    parser = argparse.ArgumentParser(description='Set up Pinecone vector database with different configurations')
    parser.add_argument('--mode', choices=['integrated', 'standard', 'both'], default='both',
                        help='Which example to run: integrated embedding, standard vector search, or both')
    
    args = parser.parse_args()
    
    if args.mode in ['integrated', 'both']:
        try:
            print("\n--- Running Integrated Embedding Example ---")
            integrated_embedding_example()
        except Exception as e:
            print(f"Error in integrated embedding example: {e}")
    
    if args.mode in ['standard', 'both']:
        try:
            print("\n--- Running Standard Vector Search Example ---")
            vector_search_example()
        except Exception as e:
            print(f"Error in standard vector search example: {e}")
    
    print("\nPinecone setup examples completed.")

if __name__ == "__main__":
    main() 