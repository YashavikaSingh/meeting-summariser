#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 18:00:05
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 13:09:58

import os
from pinecone import Pinecone
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

def check_pinecone_connection():
    """
    Check connection to Pinecone and list available indexes using the v6.0.0 API.
    """
    try:
        # Get Pinecone API key from environment variables
        api_key = os.getenv('PINECONE_API_KEY')
        if not api_key:
            return {
                "status": "error",
                "message": "PINECONE_API_KEY environment variable is not set"
            }
        
        # Try to initialize Pinecone with v6.0.0 API
        print("Attempting to connect to Pinecone with v6.0.0 API...")
        pc = Pinecone(api_key=api_key)
        
        # List available indexes
        indexes = pc.list_indexes()
        print(f"Available indexes: {indexes}")
        
        # Get index names as a list
        index_names = [index.name for index in indexes]
        
        # Check if our target index exists
        index_name = "meeting-summarizer"
        if index_name in index_names:
            print(f"Index '{index_name}' exists!")
            
            # Connect to the index and get stats
            index = pc.Index(index_name)
            try:
                stats = index.describe_index_stats()
                print(f"Index stats: {stats}")
                return {
                    "status": "success",
                    "message": f"Successfully connected to index '{index_name}'",
                    "indexes": index_names,
                    "stats": str(stats)
                }
            except Exception as e:
                print(f"Error getting index stats: {e}")
                return {
                    "status": "partial_success",
                    "message": f"Connected to Pinecone but couldn't get stats for index '{index_name}': {str(e)}",
                    "indexes": index_names
                }
        else:
            print(f"Index '{index_name}' does not exist.")
            return {
                "status": "partial_success", 
                "message": f"Connected to Pinecone but index '{index_name}' does not exist",
                "indexes": index_names
            }
            
    except Exception as e:
        print(f"Error connecting to Pinecone: {e}")
        return {
            "status": "error",
            "message": f"Failed to connect to Pinecone: {str(e)}"
        }

def main():
    print("Checking Pinecone connection and indexes...")
    result = check_pinecone_connection()
    
    print("\nSummary:")
    print(f"Status: {result['status']}")
    print(f"Message: {result['message']}")
    
    if 'indexes' in result:
        print(f"Available indexes: {', '.join(result['indexes']) if result['indexes'] else 'None'}")
    
    print("\nNext steps:")
    if result['status'] == "success" and "meeting-summarizer" in result.get('indexes', []):
        print("- The 'meeting-summarizer' index is ready to use")
        print("- You can now run the load_json_to_pinecone.py script to upload meeting data")
    elif result['status'] in ["success", "partial_success"]:
        if not result.get('indexes', []):
            print("- No indexes found in your Pinecone account")
            print("- Create the 'meeting-summarizer' index using the Pinecone dashboard if needed")
        else:
            print(f"- Available indexes: {', '.join(result['indexes'])}")
            print("- You can use one of these existing indexes or create a new one")
    else:
        print("- Check your Pinecone API key")
        print("- Verify your Pinecone account status and permissions")

if __name__ == "__main__":
    main() 