# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-20 11:50:05
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-20 11:50:44
import os
from pinecone import Pinecone
from dotenv import load_dotenv
import google.generativeai as genai
import uuid
import json
from datetime import datetime
# Updated import for google-generativeai 0.7.0
# from google.genai.types import EmbedContentConfig

# Load environment variables
load_dotenv()

# Initialize Pinecone client
PINECONE_API_KEY = os.getenv('PINECONE_API_KEY')
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY environment variable is not set")

# Initialize Pinecone with the v6.0.0 API
pc = Pinecone(api_key=PINECONE_API_KEY)

# Initialize Gemini for embeddings
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set")

genai.configure(api_key=GOOGLE_API_KEY)
embedding_model = genai.GenerativeModel('embedding-001')

# Default index name and namespace
INDEX_NAME = "meeting-summarizer"
DEFAULT_NAMESPACE = "meetings"

def initialize_vector_db():
    """Initialize the vector database, creating an index if it doesn't exist."""
    try:
        # Check if index exists
        index_exists = False
        indexes = pc.list_indexes()
        
        for index_info in indexes.get('indexes', []):
            if index_info.get('name') == INDEX_NAME:
                index_exists = True
                break
        
        # Create index if it doesn't exist
        if not index_exists:
            print(f"Creating Pinecone index: {INDEX_NAME}")
            pc.create_index(
                name=INDEX_NAME,
                dimension=768,  # Dimension of Gemini embeddings
                metric="cosine",
                spec={
                    "serverless": {
                        "cloud": "aws",
                        "region": "us-west-2"
                    }
                }
            )
            print(f"Index {INDEX_NAME} created successfully")
        else:
            print(f"Index {INDEX_NAME} already exists")
            
        # Connect to the index to verify it's working
        connect_to_index()
        return True
    
    except Exception as e:
        print(f"Error initializing vector database: {e}")
        return False

def get_embedding(text):
    """Generate embedding for a text using Gemini embedding model"""
    try:
        # Updated for google-generativeai 0.7.0
        # Configure embedding generation with the appropriate task type
        embedding_result = embedding_model.embed_content(
            text,
            task_type="retrieval_document",
            title="meeting transcript"
        )
        
        return embedding_result.embedding
    except Exception as e:
        print(f"Error generating embedding: {e}")
        raise

def connect_to_index(index_name=INDEX_NAME):
    """Connect to Pinecone index"""
    try:
        index = pc.Index(index_name)
        return index
    except Exception as e:
        print(f"Error connecting to index {index_name}: {e}")
        raise

def store_meeting(transcript, meeting_name, meeting_date, attendees, summary=None, namespace=DEFAULT_NAMESPACE):
    """
    Store a meeting in the vector database.
    
    Args:
        transcript (str): The meeting transcript
        meeting_name (str): Name of the meeting
        meeting_date (str): Date of the meeting
        attendees (list): List of attendees' email addresses
        summary (str, optional): Meeting summary if available
        namespace (str, optional): Namespace to store in
    
    Returns:
        dict: Status and meeting ID
    """
    try:
        # Generate a unique meeting ID
        meeting_id = str(uuid.uuid4())
        
        # Generate embedding for the transcript
        content = transcript
        if summary:
            content += " " + summary
        
        embedding = get_embedding(content)
        
        # Prepare metadata
        metadata = {
            "meeting_name": meeting_name,
            "meeting_date": meeting_date,
            "attendees": attendees,
            "transcript": transcript,
            "timestamp": datetime.now().isoformat()
        }
        
        # Add summary if available
        if summary:
            metadata["summary"] = summary
        
        # Connect to the index
        index = connect_to_index()
        
        # Store in Pinecone using v6.0.0 API format
        index.upsert(
            vectors=[
                {
                    "id": meeting_id,
                    "values": embedding,
                    "metadata": metadata
                }
            ],
            namespace=namespace
        )
        
        return {
            "status": "success",
            "meeting_id": meeting_id
        }
    except Exception as e:
        print(f"Error storing meeting: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

def retrieve_meeting(meeting_id, namespace=DEFAULT_NAMESPACE):
    """
    Retrieve a specific meeting by ID.
    
    Args:
        meeting_id (str): Meeting ID to retrieve
        namespace (str, optional): Namespace to retrieve from
    
    Returns:
        dict: Meeting data if found
    """
    try:
        # Connect to the index
        index = connect_to_index()
        
        # Fetch the vector
        result = index.fetch(ids=[meeting_id], namespace=namespace)
        
        if meeting_id in result['vectors']:
            return {
                "status": "success",
                "meeting": result['vectors'][meeting_id]['metadata']
            }
        else:
            return {
                "status": "error",
                "message": f"Meeting {meeting_id} not found"
            }
    except Exception as e:
        print(f"Error retrieving meeting: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

def search_meetings(query, top_k=5, namespace=DEFAULT_NAMESPACE, filter_query=None):
    """
    Search for meetings semantically similar to the query.
    
    Args:
        query (str): Search query
        top_k (int, optional): Number of results to return
        namespace (str, optional): Namespace to search in
        filter_query (dict, optional): Metadata filter
    
    Returns:
        dict: List of matching meetings
    """
    try:
        # Generate embedding for the query
        query_embedding = get_embedding(query)
        
        # Connect to the index
        index = connect_to_index()
        
        # Search parameters
        search_params = {
            "vector": query_embedding,
            "top_k": top_k,
            "namespace": namespace,
            "include_metadata": True
        }
        
        # Add filter if provided
        if filter_query:
            search_params["filter"] = filter_query
        
        # Perform the search
        results = index.query(**search_params)
        
        # Process and return results
        meetings = []
        for match in results['matches']:
            meetings.append({
                "meeting_id": match['id'],
                "score": match['score'],
                "metadata": match['metadata']
            })
        
        return {
            "status": "success",
            "meetings": meetings
        }
    except Exception as e:
        print(f"Error searching meetings: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

def list_all_meetings(namespace=DEFAULT_NAMESPACE, limit=100):
    """
    List all meetings in the database.
    
    Args:
        namespace (str, optional): Namespace to list from
        limit (int, optional): Maximum number of meetings to return
    
    Returns:
        dict: List of meetings
    """
    try:
        # Connect to the index
        index = connect_to_index()
        
        # Get index stats
        stats = index.describe_index_stats()
        
        # Check if namespace exists
        if namespace not in stats['namespaces']:
            return {
                "status": "success",
                "meetings": [],
                "total": 0
            }
        
        # Get all vector IDs in the namespace
        # This is a simple approach - for production with many vectors, implement pagination
        vector_count = stats['namespaces'][namespace]['vector_count']
        
        if vector_count == 0:
            return {
                "status": "success", 
                "meetings": [],
                "total": 0
            }
        
        # Use the search endpoint with a null query to get vectors
        # This is a workaround as Pinecone v6.0.0 API doesn't have a direct method to list all vectors
        # For actual implementation, consider a different approach for listing all meetings
        dummy_embedding = [0.0] * 768  # Create a dummy embedding of zeros
        results = index.query(
            vector=dummy_embedding,
            top_k=min(vector_count, limit),
            namespace=namespace,
            include_metadata=True
        )
        
        # Process and return results
        meetings = []
        for match in results['matches']:
            meetings.append({
                "meeting_id": match['id'],
                "metadata": match['metadata']
            })
        
        return {
            "status": "success",
            "meetings": meetings,
            "total": vector_count
        }
    except Exception as e:
        print(f"Error listing meetings: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

def delete_meeting(meeting_id, namespace=DEFAULT_NAMESPACE):
    """
    Delete a meeting from the database.
    
    Args:
        meeting_id (str): Meeting ID to delete
        namespace (str, optional): Namespace to delete from
    
    Returns:
        dict: Status of the operation
    """
    try:
        # Connect to the index
        index = connect_to_index()
        
        # Delete the vector
        index.delete(ids=[meeting_id], namespace=namespace)
        
        return {
            "status": "success",
            "message": f"Meeting {meeting_id} deleted successfully"
        }
    except Exception as e:
        print(f"Error deleting meeting: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

def update_meeting_summary(meeting_id, summary, namespace=DEFAULT_NAMESPACE, additional_fields=None):
    """
    Update a meeting's summary and additional fields.
    
    Args:
        meeting_id (str): Meeting ID to update
        summary (str): New summary text
        namespace (str, optional): Namespace of the meeting
        additional_fields (dict, optional): Additional fields to update (e.g., action_items, key_topics)
    
    Returns:
        dict: Status of the operation
    """
    try:
        # First retrieve the existing meeting
        result = retrieve_meeting(meeting_id, namespace)
        
        if result["status"] != "success":
            return result
        
        meeting = result["meeting"]
        
        # Update the summary
        meeting["summary"] = summary
        
        # Update additional fields if provided
        if additional_fields:
            for key, value in additional_fields.items():
                meeting[key] = value
        
        # Generate new embedding with updated summary
        content = meeting["transcript"] + " " + summary
        embedding = get_embedding(content)
        
        # Connect to the index
        index = connect_to_index()
        
        # Upsert the updated vector
        index.upsert(
            vectors=[
                {
                    "id": meeting_id,
                    "values": embedding,
                    "metadata": meeting
                }
            ],
            namespace=namespace
        )
        
        return {
            "status": "success",
            "message": f"Meeting {meeting_id} updated successfully"
        }
    except Exception as e:
        print(f"Error updating meeting: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

def update_meeting_attendees(meeting_id, attendees, namespace=DEFAULT_NAMESPACE):
    """
    Update the attendees list for a meeting.
    
    Args:
        meeting_id (str): Meeting ID to update
        attendees (list): List of attendee email addresses
        namespace (str, optional): Namespace of the meeting
    
    Returns:
        dict: Status of the operation
    """
    try:
        # First retrieve the existing meeting
        result = retrieve_meeting(meeting_id, namespace)
        
        if result["status"] != "success":
            return result
        
        meeting = result["meeting"]
        
        # Update the attendees
        meeting["attendees"] = attendees
        
        # Generate new embedding with updated metadata
        content = meeting["transcript"]
        if "summary" in meeting and meeting["summary"]:
            content += " " + meeting["summary"]
            
        embedding = get_embedding(content)
        
        # Connect to the index
        index = connect_to_index()
        
        # Upsert the updated vector
        index.upsert(
            vectors=[
                {
                    "id": meeting_id,
                    "values": embedding,
                    "metadata": meeting
                }
            ],
            namespace=namespace
        )
        
        return {
            "status": "success",
            "message": f"Meeting {meeting_id} attendees updated successfully"
        }
    except Exception as e:
        print(f"Error updating meeting attendees: {e}")
        return {
            "status": "error",
            "message": str(e)
        } 