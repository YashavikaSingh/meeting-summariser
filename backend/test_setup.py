# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 13:15:54
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 13:17:00
#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Date:   2025-05-27 10:00:00

import os
import sys
from dotenv import load_dotenv
import time
import argparse

# Load environment variables
load_dotenv()

def check_environment_variables():
    """Check if required environment variables are set."""
    print("\n=== Checking Environment Variables ===")
    
    required_vars = {
        'PINECONE_API_KEY': os.getenv('PINECONE_API_KEY'),
        'GOOGLE_API_KEY': os.getenv('GOOGLE_API_KEY')
    }
    
    all_present = True
    for var_name, var_value in required_vars.items():
        if not var_value:
            print(f"❌ {var_name} is not set")
            all_present = False
        else:
            print(f"✅ {var_name} is set")
    
    return all_present

def check_pinecone_connection():
    """Check if we can connect to Pinecone and if the index exists."""
    print("\n=== Checking Pinecone Connection ===")
    
    try:
        from pinecone import Pinecone
        
        # Initialize Pinecone
        api_key = os.getenv('PINECONE_API_KEY')
        if not api_key:
            print("❌ PINECONE_API_KEY is not set")
            return False
        
        print("Connecting to Pinecone...")
        pc = Pinecone(api_key=api_key)
        
        # List indexes
        indexes = pc.list_indexes()
        index_names = [index.name for index in indexes]
        
        print(f"Available indexes: {', '.join(index_names) if index_names else 'No indexes found'}")
        
        # Check if our index exists
        index_name = "meeting-summarizer"
        if index_name in index_names:
            print(f"✅ Index '{index_name}' exists")
            
            # Try to connect to the index
            try:
                index = pc.Index(index_name)
                stats = index.describe_index_stats()
                print(f"✅ Successfully connected to index '{index_name}'")
                print(f"Index stats: {stats}")
                return True
            except Exception as e:
                print(f"❌ Error connecting to index: {e}")
                return False
        else:
            print(f"❌ Index '{index_name}' does not exist")
            print(f"Please create the index with the following configuration:")
            print(f"  - Name: {index_name}")
            print(f"  - Dimensions: 768 (for Gemini embeddings)")
            print(f"  - Metric: cosine")
            return False
        
    except ImportError:
        print("❌ Could not import Pinecone. Is it installed?")
        print("Try running: pip install pinecone-client==6.0.0")
        return False
    except Exception as e:
        print(f"❌ Error connecting to Pinecone: {e}")
        return False

def check_gemini_connection():
    """Check if we can connect to Google Gemini API and generate embeddings."""
    print("\n=== Checking Google Gemini Connection ===")
    
    try:
        import google.generativeai as genai
        from google.genai.types import EmbedContentConfig
        
        # Initialize Gemini
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            print("❌ GOOGLE_API_KEY is not set")
            return False
        
        print("Connecting to Google Gemini API...")
        genai.configure(api_key=api_key)
        
        # Try to create an embedding
        try:
            print("Testing embedding generation...")
            embedding_model = genai.GenerativeModel('embedding-001')
            
            # Configure embedding generation
            config = EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768,
            )
            
            # Generate embedding
            result = embedding_model.generate_content(
                "This is a test",
                config=config
            )
            embedding = result.embedding
            
            if embedding and len(embedding) > 0:
                print(f"✅ Successfully generated embedding (dimension: {len(embedding)})")
                return True
            else:
                print("❌ Generated embedding is empty")
                return False
        except Exception as e:
            print(f"❌ Error generating embedding: {e}")
            return False
        
    except ImportError:
        print("❌ Could not import Google Generative AI. Is it installed?")
        print("Try running: pip install google-generativeai==0.5.0")
        return False
    except Exception as e:
        print(f"❌ Error connecting to Google Gemini API: {e}")
        return False

def check_flask_setup():
    """Check if Flask is installed and can be imported."""
    print("\n=== Checking Flask Setup ===")
    
    try:
        import flask
        from flask_cors import CORS
        
        print(f"✅ Flask is installed (version: {flask.__version__})")
        return True
    except ImportError:
        print("❌ Could not import Flask or Flask-CORS. Are they installed?")
        print("Try running: pip install Flask==2.3.3 Flask-CORS==4.0.0")
        return False
    except Exception as e:
        print(f"❌ Error checking Flask: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Test the environment setup for the Meeting Summarizer')
    parser.add_argument('--skip-pinecone', action='store_true', help='Skip Pinecone connection check')
    parser.add_argument('--skip-gemini', action='store_true', help='Skip Google Gemini connection check')
    
    args = parser.parse_args()
    
    print("===== Meeting Summarizer System Setup Check =====")
    
    # Check environment variables
    env_vars_ok = check_environment_variables()
    
    # Check Pinecone connection
    if not args.skip_pinecone:
        pinecone_ok = check_pinecone_connection()
    else:
        print("\n=== Skipping Pinecone Connection Check ===")
        pinecone_ok = True
    
    # Check Gemini connection
    if not args.skip_gemini:
        gemini_ok = check_gemini_connection()
    else:
        print("\n=== Skipping Google Gemini Connection Check ===")
        gemini_ok = True
    
    # Check Flask setup
    flask_ok = check_flask_setup()
    
    # Summary
    print("\n===== Setup Check Summary =====")
    print(f"Environment Variables: {'✅ OK' if env_vars_ok else '❌ Issues Found'}")
    print(f"Pinecone Connection: {'✅ OK' if pinecone_ok else '❌ Issues Found'}")
    print(f"Google Gemini Connection: {'✅ OK' if gemini_ok else '❌ Issues Found'}")
    print(f"Flask Setup: {'✅ OK' if flask_ok else '❌ Issues Found'}")
    
    if env_vars_ok and pinecone_ok and gemini_ok and flask_ok:
        print("\n✅ All checks passed! The system is ready to use.")
        return 0
    else:
        print("\n❌ Issues found. Please fix them before proceeding.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 