#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-21 09:30:05

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import time
from vector_db import (
    list_all_meetings, 
    retrieve_meeting, 
    search_meetings,
    DEFAULT_NAMESPACE
)
from process_transcripts import process_meeting, process_all_meetings

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/api/meetings', methods=['GET'])
def get_meetings():
    """
    Get all meetings, sorted by newest to oldest.
    
    Query parameters:
    - namespace: Pinecone namespace (optional)
    - limit: Maximum number of meetings to return (optional)
    - process: Whether to process meetings without summaries (optional, default: false)
    """
    namespace = request.args.get('namespace', DEFAULT_NAMESPACE)
    limit = int(request.args.get('limit', 100))
    process = request.args.get('process', 'false').lower() == 'true'
    
    # Process meetings if requested
    if process:
        process_all_meetings(namespace)
    
    # Get all meetings
    result = list_all_meetings(namespace, limit)
    
    if result["status"] != "success":
        return jsonify({"status": "error", "message": result.get("message", "Unknown error")}), 500
    
    # Sort by meeting date (newest first)
    meetings = result["meetings"]
    meetings.sort(key=lambda x: x["metadata"].get("meeting_date", "0000-00-00"), reverse=True)
    
    # Format the response
    formatted_meetings = []
    for meeting in meetings:
        formatted_meeting = {
            "id": meeting["meeting_id"],
            "name": meeting["metadata"].get("meeting_name", "Untitled Meeting"),
            "date": meeting["metadata"].get("meeting_date", "Unknown date"),
            "attendees": meeting["metadata"].get("attendees", []),
            "has_summary": "summary" in meeting["metadata"],
            "has_enhanced_data": any(
                key in meeting["metadata"] for key in ["action_items", "key_topics", "decisions", "next_steps"]
            )
        }
        formatted_meetings.append(formatted_meeting)
    
    return jsonify({
        "status": "success",
        "meetings": formatted_meetings,
        "total": result["total"]
    })

@app.route('/api/meetings/<meeting_id>', methods=['GET'])
def get_meeting(meeting_id):
    """
    Get a specific meeting by ID.
    
    Query parameters:
    - namespace: Pinecone namespace (optional)
    - process: Whether to process the meeting if it doesn't have a summary (optional, default: false)
    """
    namespace = request.args.get('namespace', DEFAULT_NAMESPACE)
    process_if_needed = request.args.get('process', 'false').lower() == 'true'
    
    # Get the meeting
    result = retrieve_meeting(meeting_id, namespace)
    
    if result["status"] != "success":
        return jsonify({"status": "error", "message": result.get("message", "Unknown error")}), 404
    
    meeting = result["meeting"]
    
    # Check if processing is needed and requested
    if process_if_needed and (
        "summary" not in meeting or not any(
            key in meeting for key in ["action_items", "key_topics", "decisions", "next_steps"]
        )
    ):
        print(f"Processing meeting {meeting_id}...")
        process_result = process_meeting(meeting_id, namespace)
        
        if process_result["status"] == "success":
            # Fetch the updated meeting
            result = retrieve_meeting(meeting_id, namespace)
            if result["status"] == "success":
                meeting = result["meeting"]
    
    # Format the response
    formatted_meeting = {
        "id": meeting_id,
        "name": meeting.get("meeting_name", "Untitled Meeting"),
        "date": meeting.get("meeting_date", "Unknown date"),
        "attendees": meeting.get("attendees", []),
        "transcript": meeting.get("transcript", ""),
        "summary": meeting.get("summary", ""),
        "action_items": meeting.get("action_items", []),
        "key_topics": meeting.get("key_topics", []),
        "decisions": meeting.get("decisions", []),
        "next_steps": meeting.get("next_steps", []),
        "processed_at": meeting.get("processed_at", "")
    }
    
    return jsonify({
        "status": "success",
        "meeting": formatted_meeting
    })

@app.route('/api/meetings/search', methods=['GET'])
def search():
    """
    Search for meetings by query.
    
    Query parameters:
    - q: Search query (required)
    - namespace: Pinecone namespace (optional)
    - limit: Maximum number of results (optional)
    """
    query = request.args.get('q')
    namespace = request.args.get('namespace', DEFAULT_NAMESPACE)
    limit = int(request.args.get('limit', 5))
    
    if not query:
        return jsonify({"status": "error", "message": "Search query is required"}), 400
    
    # Search for meetings
    result = search_meetings(query, limit, namespace)
    
    if result["status"] != "success":
        return jsonify({"status": "error", "message": result.get("message", "Unknown error")}), 500
    
    # Format the response
    formatted_meetings = []
    for meeting in result["meetings"]:
        formatted_meeting = {
            "id": meeting["meeting_id"],
            "name": meeting["metadata"].get("meeting_name", "Untitled Meeting"),
            "date": meeting["metadata"].get("meeting_date", "Unknown date"),
            "attendees": meeting["metadata"].get("attendees", []),
            "summary": meeting["metadata"].get("summary", ""),
            "score": meeting["score"],
            "has_summary": "summary" in meeting["metadata"],
            "has_enhanced_data": any(
                key in meeting["metadata"] for key in ["action_items", "key_topics", "decisions", "next_steps"]
            )
        }
        formatted_meetings.append(formatted_meeting)
    
    return jsonify({
        "status": "success",
        "meetings": formatted_meetings
    })

@app.route('/api/process', methods=['POST'])
def process():
    """
    Process all meetings that need summarization.
    """
    namespace = request.json.get('namespace', DEFAULT_NAMESPACE)
    
    # Process all meetings
    result = process_all_meetings(namespace)
    
    return jsonify(result)

@app.route('/api/process/<meeting_id>', methods=['POST'])
def process_single(meeting_id):
    """
    Process a specific meeting.
    """
    namespace = request.json.get('namespace', DEFAULT_NAMESPACE)
    
    # Process the meeting
    result = process_meeting(meeting_id, namespace)
    
    if result["status"] != "success":
        return jsonify(result), 500
    
    return jsonify(result)

@app.route('/api/chat', methods=['POST'])
def chat_with_meeting():
    """
    Chat with a meeting using the LLM.
    
    Request body:
    - meeting_id: Meeting ID to chat with
    - query: User's question
    - namespace: Pinecone namespace (optional)
    """
    meeting_id = request.json.get('meeting_id')
    query = request.json.get('query')
    namespace = request.json.get('namespace', DEFAULT_NAMESPACE)
    
    if not meeting_id:
        return jsonify({"status": "error", "message": "Meeting ID is required"}), 400
    
    if not query:
        return jsonify({"status": "error", "message": "Query is required"}), 400
    
    # Get the meeting
    result = retrieve_meeting(meeting_id, namespace)
    
    if result["status"] != "success":
        return jsonify({"status": "error", "message": f"Meeting not found: {result.get('message', 'Unknown error')}"}), 404
    
    meeting = result["meeting"]
    
    # Import here to avoid circular import
    import google.generativeai as genai
    
    # Initialize Gemini
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        return jsonify({"status": "error", "message": "GOOGLE_API_KEY environment variable is not set"}), 500
    
    genai.configure(api_key=GOOGLE_API_KEY)
    llm_model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Prepare context for the LLM
    context = f"""
    Meeting Name: {meeting.get('meeting_name', 'Untitled Meeting')}
    Date: {meeting.get('meeting_date', 'Unknown date')}
    Attendees: {', '.join(meeting.get('attendees', []))}
    
    Summary: {meeting.get('summary', 'No summary available')}
    
    Key Topics: {', '.join(meeting.get('key_topics', ['Not specified']))}
    
    Action Items: {', '.join(str(item) for item in meeting.get('action_items', ['None']))}
    
    Decisions: {', '.join(meeting.get('decisions', ['None']))}
    
    Next Steps: {', '.join(meeting.get('next_steps', ['None']))}
    
    Full Transcript:
    {meeting.get('transcript', 'No transcript available')}
    """
    
    prompt = f"""
    You are an AI assistant that helps users understand meeting details. 
    I'll provide you with information about a specific meeting, and your task is to
    answer the user's question based on that meeting information.
    
    Here is the meeting information:
    {context}
    
    User's Question: {query}
    
    Please answer the question based only on the meeting information provided. 
    If the answer isn't contained in the meeting information, politely say so.
    Keep your response conversational, helpful, and concise.
    """
    
    try:
        # Generate response
        start_time = time.time()
        response = llm_model.generate_content(prompt)
        end_time = time.time()
        
        return jsonify({
            "status": "success",
            "response": response.text,
            "processing_time": round(end_time - start_time, 2)
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error generating response: {str(e)}"
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True) 